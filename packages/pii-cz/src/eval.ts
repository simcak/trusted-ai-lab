/**
 * Span-level evaluation of PII detection against gold annotations.
 *
 * - strict: a prediction counts only with the exact span and type;
 * - overlap: same type and any character overlap (each gold / prediction matched at most once);
 * - leakage: what would reach the model unmasked — gold spans not covered by any prediction of
 *   any type (a wrong type still masks the value, so it does not leak).
 */
import { PII_TYPES, type PiiType } from './types.ts';

export interface Span {
  start: number;
  end: number;
  type: PiiType;
}

export interface EvalCase {
  id: string;
  text: string;
  gold: readonly Span[];
  predicted: readonly Span[];
}

export interface Prf {
  precision: number | null;
  recall: number | null;
  f1: number | null;
}

export interface TypeMetrics {
  /** Gold spans of this type. */
  support: number;
  /** Predicted spans of this type. */
  predicted: number;
  tp: number;
  fp: number;
  fn: number;
  strict: Prf;
  overlap: Prf & { tp: number };
}

export interface Leakage {
  goldSpans: number;
  /** Gold spans with no overlapping prediction at all. */
  leakedSpans: number;
  /** Gold spans only partially covered. */
  partialSpans: number;
  spanRate: number | null;
  goldChars: number;
  leakedChars: number;
  charRate: number | null;
}

export type ErrorNote = 'missed' | 'partial' | 'wrong_type' | 'spurious';

export interface ErrorExample {
  kind: 'false_negative' | 'false_positive';
  type: PiiType;
  note: ErrorNote;
  /** Type of the overlapping span on the other side, for `wrong_type`. */
  otherType?: PiiType;
  docId: string;
  span: string;
  /** Surrounding text with the span marked as ⟦…⟧. */
  context: string;
}

export interface EvalReport {
  documents: number;
  perType: Record<PiiType, TypeMetrics>;
  micro: TypeMetrics;
  leakage: Leakage;
  errors: ErrorExample[];
}

export interface EvaluateOptions {
  maxErrorsPerType?: number;
  contextChars?: number;
  types?: readonly PiiType[];
}

const round = (x: number) => Math.round(x * 10_000) / 10_000;
const ratio = (num: number, den: number) => (den === 0 ? null : round(num / den));

function prf(tp: number, predicted: number, support: number): Prf {
  const precision = ratio(tp, predicted);
  const recall = ratio(tp, support);
  const f1 =
    precision === null || recall === null
      ? null
      : precision + recall === 0
        ? 0
        : round((2 * precision * recall) / (precision + recall));
  return { precision, recall, f1 };
}

const same = (a: Span, b: Span) => a.start === b.start && a.end === b.end && a.type === b.type;
const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end;

function context(text: string, span: Span, chars: number): string {
  const from = Math.max(0, span.start - chars);
  const to = Math.min(text.length, span.end + chars);
  const clean = (s: string) => s.replace(/\s+/g, ' ');
  return (
    (from > 0 ? '…' : '') +
    clean(text.slice(from, span.start)) +
    '⟦' +
    clean(text.slice(span.start, span.end)) +
    '⟧' +
    clean(text.slice(span.end, to)) +
    (to < text.length ? '…' : '')
  );
}

/** Greedy one-to-one matching of overlapping spans of the same type. */
function overlapMatches(gold: readonly Span[], predicted: readonly Span[]): number {
  const used = new Set<number>();
  let matches = 0;
  for (const g of gold) {
    const index = predicted.findIndex(
      (p, i) => !used.has(i) && p.type === g.type && overlaps(p, g),
    );
    if (index !== -1) {
      used.add(index);
      matches += 1;
    }
  }
  return matches;
}

export function evaluate(cases: readonly EvalCase[], options: EvaluateOptions = {}): EvalReport {
  const types = options.types ?? PII_TYPES;
  const maxErrors = options.maxErrorsPerType ?? 5;
  const contextChars = options.contextChars ?? 30;

  const counts = new Map<PiiType, { support: number; predicted: number; tp: number; otp: number }>(
    types.map((t) => [t, { support: 0, predicted: 0, tp: 0, otp: 0 }]),
  );
  const errors: ErrorExample[] = [];
  const errorCount = new Map<string, number>();
  const pushError = (e: ErrorExample) => {
    const key = `${e.type}:${e.kind}`;
    const n = errorCount.get(key) ?? 0;
    if (n < maxErrors) errors.push(e);
    errorCount.set(key, n + 1);
  };

  const leakage = { goldSpans: 0, leakedSpans: 0, partialSpans: 0, goldChars: 0, leakedChars: 0 };

  for (const c of cases) {
    const gold = c.gold.filter((s) => counts.has(s.type));
    const predicted = c.predicted.filter((s) => counts.has(s.type));

    for (const type of types) {
      const g = gold.filter((s) => s.type === type);
      const p = predicted.filter((s) => s.type === type);
      const entry = counts.get(type)!;
      entry.support += g.length;
      entry.predicted += p.length;
      entry.tp += g.filter((gs) => p.some((ps) => same(gs, ps))).length;
      entry.otp += overlapMatches(g, p);
    }

    for (const g of gold) {
      if (predicted.some((p) => same(p, g))) continue;
      const other = predicted.find((p) => overlaps(p, g));
      pushError({
        kind: 'false_negative',
        type: g.type,
        note: !other ? 'missed' : other.type === g.type ? 'partial' : 'wrong_type',
        ...(other && other.type !== g.type ? { otherType: other.type } : {}),
        docId: c.id,
        span: c.text.slice(g.start, g.end),
        context: context(c.text, g, contextChars),
      });
    }
    for (const p of predicted) {
      if (gold.some((g) => same(g, p))) continue;
      const other = gold.find((g) => overlaps(g, p));
      pushError({
        kind: 'false_positive',
        type: p.type,
        note: !other ? 'spurious' : other.type === p.type ? 'partial' : 'wrong_type',
        ...(other && other.type !== p.type ? { otherType: other.type } : {}),
        docId: c.id,
        span: c.text.slice(p.start, p.end),
        context: context(c.text, p, contextChars),
      });
    }

    // Leakage is type-agnostic: any prediction masks the characters it covers.
    for (const g of gold) {
      let uncovered = 0;
      for (let i = g.start; i < g.end; i++) {
        if (/\s/.test(c.text[i]!)) continue;
        if (!predicted.some((p) => p.start <= i && i < p.end)) uncovered += 1;
      }
      const chars = c.text.slice(g.start, g.end).replace(/\s/g, '').length;
      leakage.goldSpans += 1;
      leakage.goldChars += chars;
      leakage.leakedChars += uncovered;
      if (uncovered === chars) leakage.leakedSpans += 1;
      else if (uncovered > 0) leakage.partialSpans += 1;
    }
  }

  const metrics = (support: number, predicted: number, tp: number, otp: number): TypeMetrics => ({
    support,
    predicted,
    tp,
    fp: predicted - tp,
    fn: support - tp,
    strict: prf(tp, predicted, support),
    overlap: { tp: otp, ...prf(otp, predicted, support) },
  });

  const perType = {} as Record<PiiType, TypeMetrics>;
  let total = { support: 0, predicted: 0, tp: 0, otp: 0 };
  for (const type of types) {
    const e = counts.get(type)!;
    perType[type] = metrics(e.support, e.predicted, e.tp, e.otp);
    total = {
      support: total.support + e.support,
      predicted: total.predicted + e.predicted,
      tp: total.tp + e.tp,
      otp: total.otp + e.otp,
    };
  }

  return {
    documents: cases.length,
    perType,
    micro: metrics(total.support, total.predicted, total.tp, total.otp),
    leakage: {
      ...leakage,
      spanRate: ratio(leakage.leakedSpans, leakage.goldSpans),
      charRate: ratio(leakage.leakedChars, leakage.goldChars),
    },
    errors,
  };
}
