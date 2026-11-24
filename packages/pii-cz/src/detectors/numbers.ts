import { contextScore, finding } from '../context.ts';
import type { Detector, Finding, ReasonCode } from '../types.ts';
import { parseBankAccount } from '../validators/bank-account.ts';
import { parseDic } from '../validators/dic.ts';
import { parseIban } from '../validators/iban.ts';
import { isValidIco } from '../validators/ico.ts';
import { parseRodneCislo } from '../validators/rodne-cislo.ts';

// Digit runs must not be glued to letters, digits or account / range separators.
const L = String.raw`(?<![\p{L}\p{N}/-])`;
const R = String.raw`(?![\p{L}\p{N}/-])`;

const RODNE_CISLO = new RegExp(String.raw`${L}(\d{6})(\s?/\s?|\s)?(\d{3,4})${R}`, 'gu');

export const detectRodneCislo: Detector = (text, ctx) => {
  const out: Finding[] = [];
  for (const m of text.matchAll(RODNE_CISLO)) {
    const start = m.index;
    const end = start + m[0].length;
    const result = parseRodneCislo(m[0], { today: ctx.today });
    if (!result.valid) continue;
    const slash = m[2]?.includes('/') ?? false;
    const reasons: ReasonCode[] = ['format', 'valid_birth_date'];
    let score: number;
    if (result.length === 10) {
      score = result.remainder10Exception ? 0.55 : 0.7;
      reasons.push(result.remainder10Exception ? 'remainder_10_exception' : 'checksum_mod11');
    } else {
      // Nine digits carry no checksum: any 9-digit number with a plausible date matches.
      score = 0.3;
      reasons.push('nine_digit_pre_1954');
      if (result.birthDate.year < 1900) score -= 0.2;
    }
    if (result.supplementary) reasons.push('supplementary_series');
    if (slash) {
      score += result.length === 10 ? 0.15 : 0.3;
      reasons.push('slash_separator');
    }
    score += contextScore('RODNE_CISLO', text, start, end, reasons, {
      bonus: result.length === 10 ? 0.15 : 0.3,
      penalty: 0.4,
    });
    out.push(finding('RODNE_CISLO', text, start, end, score, reasons));
  }
  return out;
};

const ICO = new RegExp(String.raw`${L}\d{8}${R}`, 'gu');

/** A valid check digit alone is weak evidence (≈ 1 in 10 random numbers pass); needs context. */
export const detectIco: Detector = (text) => {
  const out: Finding[] = [];
  for (const m of text.matchAll(ICO)) {
    if (!isValidIco(m[0])) continue;
    const start = m.index;
    const end = start + m[0].length;
    const reasons: ReasonCode[] = ['format', 'checksum_mod11'];
    const score = 0.45 + contextScore('ICO', text, start, end, reasons, { bonus: 0.45 });
    out.push(finding('ICO', text, start, end, score, reasons));
  }
  return out;
};

const DIC = /(?<![\p{L}\p{N}])CZ\s?\d{8,10}(?![\p{L}\p{N}/-])/gu;

export const detectDic: Detector = (text, ctx) => {
  const out: Finding[] = [];
  for (const m of text.matchAll(DIC)) {
    const result = parseDic(m[0], { today: ctx.today });
    if (!result.valid) continue;
    const start = m.index;
    const end = start + m[0].length;
    const reasons: ReasonCode[] = ['format'];
    if (result.kind === 'ico') reasons.push('dic_from_ico', 'checksum_mod11');
    else if (result.kind === 'rodne_cislo') reasons.push('dic_from_rodne_cislo');
    else reasons.push('dic_special_699');
    let score = result.kind === 'special_699' ? 0.7 : 0.9;
    score += contextScore('DIC', text, start, end, reasons, { bonus: 0.08, penalty: 0 });
    out.push(finding('DIC', text, start, end, score, reasons));
  }
  return out;
};

const BANK_ACCOUNT = new RegExp(
  String.raw`${L}(?:(\d{1,6})\s?-\s?)?(\d{2,10})\s?/\s?(\d{4})(?![\p{L}\p{N}/])`,
  'gu',
);

export const detectBankAccount: Detector = (text) => {
  const out: Finding[] = [];
  for (const m of text.matchAll(BANK_ACCOUNT)) {
    const result = parseBankAccount(m[0]);
    if (!result.valid) continue;
    const start = m.index;
    const end = start + m[0].length;
    const reasons: ReasonCode[] = ['format', 'checksum_mod11'];
    if (result.prefix !== undefined) reasons.push('account_prefix');
    let score: number;
    if (result.knownBank) {
      score = 0.8;
      reasons.push('known_bank_code');
    } else {
      // Unknown code: could be a reference like „1234/2026".
      score = 0.45;
      reasons.push('unknown_bank_code');
    }
    score += contextScore('BANK_ACCOUNT', text, start, end, reasons, { bonus: 0.15 });
    out.push(finding('BANK_ACCOUNT', text, start, end, score, reasons));
  }
  return out;
};

// Country code + check digits + BBAN, optionally printed in groups of four.
const IBAN = /(?<![\p{L}\p{N}])[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}/gu;

export const detectIban: Detector = (text) => {
  const out: Finding[] = [];
  for (const m of text.matchAll(IBAN)) {
    const start = m.index;
    // The pattern is greedy and may swallow a following upper-case word or number group;
    // shrink from the right until the remainder validates.
    let candidate = m[0];
    let result = parseIban(candidate);
    while (!result.valid && candidate.length > 15) {
      candidate = candidate.slice(0, -1).trimEnd();
      result = parseIban(candidate);
    }
    if (!result.valid) continue;
    const end = start + candidate.length;
    if (/[\p{L}\p{N}]/u.test(text[end] ?? '')) continue;
    const reasons: ReasonCode[] = ['format', 'checksum_mod97'];
    if (result.cz?.accountValid) reasons.push('cz_account_inside_iban');
    const score = result.cz && !result.cz.accountValid ? 0.8 : 0.95;
    out.push(finding('IBAN', text, start, end, score, reasons));
  }
  return out;
};
