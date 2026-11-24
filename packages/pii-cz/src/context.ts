import type { Finding, PiiType, ReasonCode } from './types.ts';

/** Lower-case and strip diacritics so context words match „r.č.", „r.c.", „RČ" alike. */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Folded text of up to `size` characters before `start`. */
export function before(text: string, start: number, size = 40): string {
  return fold(text.slice(Math.max(0, start - size), start));
}

/** Folded text of up to `size` characters after `end`. */
export function after(text: string, end: number, size = 20): string {
  return fold(text.slice(end, end + size));
}

/**
 * Context words (folded, i.e. without diacritics) that raise the score of a nearby candidate.
 * `(?<![a-z])` instead of `\b` so that e.g. „ic" does not match inside „dic".
 */
export const CONTEXT: Partial<Record<PiiType, RegExp>> = {
  RODNE_CISLO:
    /(?<![a-z])(?:r\.\s?c\.?|rc|rodn\w*\s+cisl\w*|nar\.|narozen\w*|datum\s+narozeni)(?![a-z])/,
  ICO: /(?<![a-z])(?:ico|ic|identifikacni\s+cisl\w*)(?![a-z])/,
  DIC: /(?<![a-z])(?:dic|danove\s+identifikacni)(?![a-z])/,
  BANK_ACCOUNT:
    /(?<![a-z])(?:c\.\s?u\.?|cislo\s+uctu|uct\w*|ucet|bankovni\s+spojeni|platb\w*|zaslat\s+na|poukaz\w*)(?![a-z])/,
  PHONE:
    /(?<![a-z])(?:tel\.?|telefon\w*|mobil\w*|mob\.|volejte|zavolejte|zavolat|kontakt\w*|sms)(?![a-z])/,
  PSC: /(?<![a-z])psc(?![a-z])/,
  ADDRESS:
    /(?<![a-z])(?:bytem|bydlist\w*|bydli\w*|adres\w*|sidl\w*|ulic\w*|ul\.|dorucovac\w*|trvale)(?![a-z])/,
};

/** Text right after a number that means "this is an amount, not an identifier". */
const AMOUNT_AFTER = /^\s*(?:,-|,\d{1,2}\s*(?:kc|czk|eur)|kc|czk|eur|usd|korun\w*|%|ks\b)/;
/** Text right before a number that means "amount / price follows". */
const AMOUNT_BEFORE =
  /(?:castk\w*|ve\s+vysi|vyse|cena|cenu|poplat\w*|suma|celkem|investic\w*)\s*:?\s*$/;

export function hasContext(type: PiiType, text: string, start: number, size = 40): boolean {
  const pattern = CONTEXT[type];
  return pattern !== undefined && pattern.test(before(text, start, size));
}

export function looksLikeAmount(text: string, start: number, end: number): boolean {
  return AMOUNT_AFTER.test(after(text, end)) || AMOUNT_BEFORE.test(before(text, start, 25));
}

export const clampScore = (score: number) =>
  Math.round(Math.min(0.99, Math.max(0, score)) * 100) / 100;

export function finding(
  type: PiiType,
  text: string,
  start: number,
  end: number,
  score: number,
  reasons: ReasonCode[],
): Finding {
  return {
    type,
    start,
    end,
    text: text.slice(start, end),
    score: clampScore(score),
    detector: 'rules',
    reasons: [...new Set(reasons)],
  };
}

/**
 * Adds the standard context adjustments: +bonus for a context word before the candidate,
 * −penalty when it looks like an amount. Mutates `reasons`.
 */
export function contextScore(
  type: PiiType,
  text: string,
  start: number,
  end: number,
  reasons: ReasonCode[],
  { bonus, penalty = 0.5, window = 40 }: { bonus: number; penalty?: number; window?: number },
): number {
  let delta = 0;
  if (hasContext(type, text, start, window)) {
    delta += bonus;
    reasons.push('context_keyword');
  }
  if (penalty > 0 && looksLikeAmount(text, start, end)) {
    delta -= penalty;
    reasons.push('negative_context');
  }
  return delta;
}
