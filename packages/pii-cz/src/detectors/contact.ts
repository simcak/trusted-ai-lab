import { after, contextScore, finding } from '../context.ts';
import type { Detector, Finding, ReasonCode } from '../types.ts';
import { deobfuscateEmail, isValidEmail, isValidPsc, parsePhone } from '../validators/contact.ts';

// Optional country code (+420 / 00420, possibly in brackets), then 3-3-3 or 3-2-2-2 digits.
const PHONE =
  /(?<![\p{L}\p{N}+/-])(?:\(?(?:\+|00)\s?420\)?[\s.-]?)?\d{3}(?:[\s.-]?\d{3}[\s.-]?\d{3}|[ ]\d{2}[ ]\d{2}[ ]\d{2})(?![\p{L}\p{N}/-])/gu;

export const detectPhone: Detector = (text) => {
  const out: Finding[] = [];
  for (const m of text.matchAll(PHONE)) {
    const phone = parsePhone(m[0]);
    if (!phone) continue;
    const start = m.index;
    const end = start + m[0].length;
    const reasons: ReasonCode[] = ['format'];
    let score: number;
    if (phone.hasCountryCode) {
      score = 0.9;
      reasons.push('country_code');
    } else if (/\d[\s.-]\d/.test(m[0])) {
      score = 0.6;
      reasons.push('grouped_digits');
    } else {
      // Nine bare digits: also order numbers, ID card numbers, nine-digit rodné číslo…
      score = 0.3;
    }
    score += contextScore('PHONE', text, start, end, reasons, { bonus: 0.3, penalty: 0.5 });
    out.push(finding('PHONE', text, start, end, score, reasons));
  }
  return out;
};

const EMAIL = /[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}/g;
const OBFUSCATED_EMAIL =
  /[A-Za-z0-9._%+-]+\s?[([{]\s?(?:at|zavináč|zavinac)\s?[)\]}]\s?[A-Za-z0-9-]+(?:(?:\.|\s?[([{]\s?(?:dot|tečka|tecka)\s?[)\]}]\s?)[A-Za-z0-9-]+)*(?:\.|\s?[([{]\s?(?:dot|tečka|tecka)\s?[)\]}]\s?)[A-Za-z]{2,24}/giu;

export const detectEmail: Detector = (text) => {
  const out: Finding[] = [];
  for (const m of text.matchAll(EMAIL)) {
    // Trim punctuation the pattern may have taken from the surrounding sentence.
    let value = m[0];
    let start = m.index;
    while (/^[.'`{|}~-]/.test(value)) {
      value = value.slice(1);
      start += 1;
    }
    value = value.replace(/\.+$/, '');
    if (!isValidEmail(value)) continue;
    out.push(finding('EMAIL', text, start, start + value.length, 0.95, ['format']));
  }
  for (const m of text.matchAll(OBFUSCATED_EMAIL)) {
    if (!isValidEmail(deobfuscateEmail(m[0]))) continue;
    out.push(
      finding('EMAIL', text, m.index, m.index + m[0].length, 0.8, ['format', 'obfuscated_email']),
    );
  }
  return out;
};

const PSC = /(?<![\p{L}\p{N}/,.-])[1-7]\d{2}\s?\d{2}(?![\p{L}\p{N}/-]|[.,]\d)/gu;

/** Stand-alone PSČ; inside a full address the ADDRESS finding wins (see resolve.ts). */
export const detectPsc: Detector = (text) => {
  const out: Finding[] = [];
  for (const m of text.matchAll(PSC)) {
    if (!isValidPsc(m[0])) continue;
    const start = m.index;
    const end = start + m[0].length;
    const reasons: ReasonCode[] = ['format'];
    const spaced = /\s/.test(m[0]);
    let score = spaced ? 0.4 : 0.1;
    if (spaced && /^\s+\p{Lu}\p{Ll}/u.test(text.slice(end, end + 3))) {
      score += 0.2;
      reasons.push('postal_code_and_city');
    }
    score += contextScore('PSC', text, start, end, reasons, { bonus: 0.45, window: 25 });
    out.push(finding('PSC', text, start, end, score, reasons));
  }
  return out;
};

// Document numbers are reported only right after a context word (no checksum exists).
const ID_CARD =
  /(?<!\p{L})(?:OP|občansk\p{L}*\s+průkaz\p{L}*|občansk\p{L}*|obcansk\p{L}*\s+prukaz\p{L}*)(?!\p{L})[^\d\n]{0,25}?(\d{9})(?!\p{N})/giu;
const PASSPORT =
  /(?<!\p{L})(?:cestovn\p{L}*\s+pas\p{L}*|pas|pasu|pasem)(?!\p{L})[^\d\n]{0,25}?(\d{8})(?!\p{N})/giu;

function documentDetector(type: 'ID_CARD' | 'PASSPORT', pattern: RegExp): Detector {
  return (text) => {
    const out: Finding[] = [];
    for (const m of text.matchAll(pattern)) {
      const digits = m[1]!;
      const start = m.index + m[0].length - digits.length;
      const end = start + digits.length;
      if (/^\s*(?:kc|czk|eur)/.test(after(text, end))) continue;
      out.push(finding(type, text, start, end, 0.85, ['format', 'context_keyword']));
    }
    return out;
  };
}

export const detectIdCard = documentDetector('ID_CARD', ID_CARD);
export const detectPassport = documentDetector('PASSPORT', PASSPORT);
