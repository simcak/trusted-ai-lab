import { PII_TYPES, type Finding, type PiiType } from './types.ts';

/**
 * Types whose span is a structure that may contain other matches: a full address contains a PSČ
 * and possibly a street named after a person („Karla Engliše 12"); an IBAN contains digit groups;
 * a DIČ contains an IČO or rodné číslo; an e-mail contains a name. Inside them, other types lose.
 */
const CONTAINERS: ReadonlySet<PiiType> = new Set(['ADDRESS', 'IBAN', 'DIC', 'EMAIL']);

const typeRank = (type: PiiType) => PII_TYPES.indexOf(type);

const overlaps = (a: Finding, b: Finding) => a.start < b.end && b.start < a.end;

/**
 * Resolves overlapping candidates into non-overlapping findings:
 * 1. a finding strictly inside a container finding of another type is dropped;
 * 2. the rest is chosen greedily by score, then length, then type order.
 * Identical spans of the same type are merged (max score, union of reasons, joined detectors).
 */
export function resolveOverlaps(candidates: readonly Finding[]): Finding[] {
  const merged = new Map<string, Finding>();
  for (const c of candidates) {
    const key = `${c.type}:${c.start}:${c.end}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...c, reasons: [...c.reasons] });
      continue;
    }
    merged.set(key, {
      ...existing,
      score: Math.max(existing.score, c.score),
      reasons: [...new Set([...existing.reasons, ...c.reasons])],
      detector:
        existing.detector === c.detector ? existing.detector : `${existing.detector}+${c.detector}`,
    });
  }

  const all = [...merged.values()];
  const containers = all.filter((f) => CONTAINERS.has(f.type));
  const kept = all.filter(
    (f) =>
      !containers.some(
        (c) =>
          c.type !== f.type &&
          c.start <= f.start &&
          f.end <= c.end &&
          c.end - c.start > f.end - f.start,
      ),
  );

  kept.sort(
    (a, b) =>
      b.score - a.score ||
      b.end - b.start - (a.end - a.start) ||
      typeRank(a.type) - typeRank(b.type) ||
      a.start - b.start,
  );
  const chosen: Finding[] = [];
  for (const f of kept) {
    if (!chosen.some((c) => overlaps(c, f))) chosen.push(f);
  }
  return chosen.sort((a, b) => a.start - b.start);
}
