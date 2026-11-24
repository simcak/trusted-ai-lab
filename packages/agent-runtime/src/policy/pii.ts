import {
  createPseudonymizer,
  detect,
  mergeFindings,
  type Finding,
  type PiiType,
  type PseudonymEntry,
  type Replacement,
} from '@trusted-ai-lab/pii-cz';

export interface Protected<T> {
  value: T;
  replacements: Replacement[];
}

/**
 * One pseudonymisation session per agent run. Everything that goes to the model passes
 * `protect*`; tool arguments and the final answer pass `reveal*` locally.
 *
 * Values the session already knows are matched exactly, in addition to detection. Detection alone
 * depends on context words: „pan Novák“ is found, but after re-identification a bare „Novák“ in a
 * tool result might not be, and the real surname would reach the model.
 */
export interface PiiGuard {
  protectText(text: string): Protected<string>;
  /** Pseudonymises every string inside a JSON-like value separately (not the serialised JSON). */
  protectValue<T>(value: T): Protected<T>;
  revealText(text: string): { text: string; restored: number; unknown: string[] };
  /** Deep copy of `value` with every placeholder restored; the input is never mutated. */
  revealValue<T>(value: T): { value: T; restored: number };
  entries(): readonly PseudonymEntry[];
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function knownValueFindings(text: string, entries: readonly PseudonymEntry[]): Finding[] {
  const findings: Finding[] = [];
  for (const entry of entries) {
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(entry.original)}(?![\\p{L}\\p{N}])`,
      'gu',
    );
    for (const m of text.matchAll(pattern)) {
      findings.push({
        type: entry.type,
        start: m.index,
        end: m.index + m[0].length,
        text: m[0],
        score: 1,
        detector: 'session',
        reasons: [],
      });
    }
  }
  return findings;
}

function mapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === 'string') return fn(value) as T;
  if (Array.isArray(value)) return value.map((v: unknown) => mapStrings(v, fn)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, mapStrings(v, fn)]),
    ) as T;
  }
  return value;
}

export function createPiiGuard(options: { today: Date }): PiiGuard {
  const session = createPseudonymizer();

  const protectText = (text: string): Protected<string> => {
    const detected = detect(text, { today: options.today });
    const findings = mergeFindings(detected, knownValueFindings(text, session.entries()), {
      today: options.today,
    });
    const { text: masked, replacements } = session.pseudonymize(text, findings);
    return { value: masked, replacements };
  };

  return {
    protectText,
    protectValue(value) {
      const replacements: Replacement[] = [];
      const masked = mapStrings(value, (s) => {
        const result = protectText(s);
        replacements.push(...result.replacements);
        return result.value;
      });
      return { value: masked, replacements };
    },
    revealText: (text) => session.reidentify(text),
    revealValue(value) {
      let restored = 0;
      const revealed = mapStrings(value, (s) => {
        const result = session.reidentify(s);
        restored += result.restored;
        return result.text;
      });
      return { value: revealed, restored };
    },
    entries: () => session.entries(),
  };
}

/** Counts per type for trace events, which carry counts and placeholders, never values. */
export function countByType(
  replacements: readonly { type: PiiType }[],
): Partial<Record<PiiType, number>> {
  const counts: Partial<Record<PiiType, number>> = {};
  for (const r of replacements) counts[r.type] = (counts[r.type] ?? 0) + 1;
  return counts;
}
