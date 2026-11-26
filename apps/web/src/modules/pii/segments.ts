import {
  PLACEHOLDER_LABELS,
  type Finding,
  type PiiType,
  type PseudonymEntry,
  type Replacement,
} from '@trusted-ai-lab/pii-cz';

/**
 * Text cut into plain runs and tokens, so the UI can colour every replaced value by its type.
 * Joining `text` of all segments gives back exactly the string the library produced.
 */
export type Segment =
  { kind: 'text'; text: string } | { kind: 'token'; text: string; type: PiiType; original: string };

/** Output of a masking step (redaction or pseudonymisation) from its replacements. */
export function segmentsFromReplacements(
  text: string,
  replacements: readonly Replacement[],
): Segment[] {
  const out: Segment[] = [];
  let cursor = 0;
  for (const r of [...replacements].sort((a, b) => a.start - b.start)) {
    if (r.start > cursor) out.push({ kind: 'text', text: text.slice(cursor, r.start) });
    out.push({ kind: 'token', text: r.replacement, type: r.type, original: r.original });
    cursor = r.end;
  }
  if (cursor < text.length) out.push({ kind: 'text', text: text.slice(cursor) });
  return out;
}

/** The replacements `redact()` makes: every finding becomes `[TYPE]`. */
export function redactReplacements(findings: readonly Finding[]): Replacement[] {
  return findings.map((f) => ({
    start: f.start,
    end: f.end,
    type: f.type,
    original: f.text,
    replacement: `[${PLACEHOLDER_LABELS[f.type]}]`,
  }));
}

/** Same pattern as in pii-cz: `<OSOBA_1>`, `<RODNÉ_ČÍSLO_2>`… */
const PLACEHOLDER = /<\p{Lu}[\p{Lu}_-]*_\d+>/gu;

/**
 * A model reply cut at the placeholders this session issued; `original` is what the browser
 * puts back. Placeholders the session does not know stay plain text (as `reidentify` leaves them).
 */
export function replySegments(reply: string, entries: readonly PseudonymEntry[]): Segment[] {
  const byPlaceholder = new Map(entries.map((e) => [e.placeholder, e]));
  const out: Segment[] = [];
  let cursor = 0;
  for (const match of reply.matchAll(PLACEHOLDER)) {
    const entry = byPlaceholder.get(match[0]);
    if (!entry) continue;
    if (match.index > cursor) out.push({ kind: 'text', text: reply.slice(cursor, match.index) });
    out.push({
      kind: 'token',
      text: entry.placeholder,
      type: entry.type,
      original: entry.original,
    });
    cursor = match.index + match[0].length;
  }
  if (cursor < reply.length) out.push({ kind: 'text', text: reply.slice(cursor) });
  return out;
}

export const joinText = (segments: readonly Segment[]) => segments.map((s) => s.text).join('');

export const joinRestored = (segments: readonly Segment[]) =>
  segments.map((s) => (s.kind === 'token' ? s.original : s.text)).join('');
