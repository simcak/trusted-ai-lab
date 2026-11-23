/**
 * Synthetic value generators for the PII corpus.
 *
 * Deliberately independent of packages/pii-cz: checksums are computed here with separately
 * written code (left-to-right weights, BigInt mod 97…), so a bug in the library's validators
 * cannot silently produce matching gold data. All values are random; any match with a real
 * person, account or company is coincidental.
 */
import type { Faker } from '@faker-js/faker';

export type Sex = 'M' | 'F';

const pad = (n: number, width: number) => String(n).padStart(width, '0');

// ── Rodné číslo ──────────────────────────────────────────────────────────────────────────────

export interface RcOptions {
  sex: Sex;
  /** Birth year; 1954+ gives the 10-digit form, earlier years the 9-digit form. */
  year: number;
  /** Use the supplementary series (month +20 / +70); only for year ≥ 2004. */
  supplementary?: boolean;
  /** Produce a number whose first nine digits give remainder 10 and check digit 0. */
  remainder10?: boolean;
}

function daysIn(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Digits of a valid rodné číslo (without separator). */
export function rodneCislo(f: Faker, o: RcOptions): string {
  const month = f.number.int({ min: 1, max: 12 });
  const day = f.number.int({ min: 1, max: daysIn(o.year, month) });
  const offset = (o.sex === 'F' ? 50 : 0) + (o.supplementary ? 20 : 0);
  const head = pad(o.year % 100, 2) + pad(month + offset, 2) + pad(day, 2);
  if (o.year < 1954) {
    return head + pad(f.number.int({ min: 1, max: 999 }), 3);
  }
  for (;;) {
    const suffix = pad(f.number.int({ min: 0, max: 999 }), 3);
    const remainder = Number(head + suffix) % 11;
    if (o.remainder10) {
      if (remainder === 10) return `${head}${suffix}0`;
    } else if (remainder !== 10) {
      return `${head}${suffix}${remainder}`;
    }
  }
}

/** A number with the shape of a rodné číslo (valid date) but a wrong check digit. */
export function rodneCisloBadChecksum(f: Faker, sex: Sex, year: number): string {
  const valid = rodneCislo(f, { sex, year });
  const last = Number(valid.at(-1));
  const wrong = (last + f.number.int({ min: 1, max: 9 })) % 10;
  return valid.slice(0, -1) + String(wrong);
}

export const withSlash = (digits: string) => `${digits.slice(0, 6)}/${digits.slice(6)}`;

// ── IČO / DIČ ────────────────────────────────────────────────────────────────────────────────

export function ico(f: Faker): string {
  const digits = Array.from({ length: 7 }, () => f.number.int({ min: 0, max: 9 }));
  const weighted = digits.reduce((sum, d, i) => sum + d * (8 - i), 0);
  const check = (11 - (weighted % 11)) % 10;
  return digits.join('') + String(check);
}

// ── Bank account / IBAN ──────────────────────────────────────────────────────────────────────

/** Weights for a 10-digit account number, left to right (vyhláška ČNB 169/2011 Sb.). */
const ACCOUNT_WEIGHTS = [6, 3, 7, 9, 10, 5, 8, 4, 2, 1];

function accountPart(f: Faker, length: number): string {
  for (;;) {
    const digits = Array.from({ length }, () => f.number.int({ min: 0, max: 9 }));
    if (digits[0] === 0) digits[0] = f.number.int({ min: 1, max: 9 });
    const weights = ACCOUNT_WEIGHTS.slice(10 - length);
    const sum = digits.reduce((s, d, i) => s + d * weights[i]!, 0);
    if (sum % 11 === 0) return digits.join('');
  }
}

/** A subset of the ČNB bank code list (https://www.cnb.cz/cs/platebni-styk/ucty-kody-bank/). */
const BANK_CODES = ['0100', '0300', '0600', '0800', '2010', '2700', '3030', '5500', '6210', '6363'];

export interface Account {
  prefix?: string;
  number: string;
  bank: string;
}

export function account(f: Faker, withPrefix: boolean): Account {
  return {
    ...(withPrefix ? { prefix: accountPart(f, f.number.int({ min: 2, max: 6 })) } : {}),
    number: accountPart(f, f.number.int({ min: 6, max: 10 })),
    bank: f.helpers.arrayElement(BANK_CODES),
  };
}

export const formatAccount = (a: Account) =>
  `${a.prefix ? `${a.prefix}-` : ''}${a.number}/${a.bank}`;

export function iban(a: Account, grouped: boolean): string {
  const bban = a.bank + (a.prefix ?? '').padStart(6, '0') + a.number.padStart(10, '0');
  // "CZ00" moved to the end, C = 12, Z = 35.
  const check = 98n - (BigInt(`${bban}123500`) % 97n);
  const value = `CZ${String(check).padStart(2, '0')}${bban}`;
  return grouped ? value.replace(/(.{4})(?=.)/g, '$1 ') : value;
}

/** Slovak IBAN: SK + 2 check digits + 20-digit BBAN (random, valid by mod 97 only). */
export function skIban(f: Faker): string {
  const bban = Array.from({ length: 20 }, () => f.number.int({ min: 0, max: 9 })).join('');
  // "SK00" moved to the end, S = 28, K = 20.
  const check = 98n - (BigInt(`${bban}282000`) % 97n);
  return `SK${String(check).padStart(2, '0')}${bban}`.replace(/(.{4})(?=.)/g, '$1 ');
}

// ── Contact data ─────────────────────────────────────────────────────────────────────────────

const MOBILE_PREFIXES = [
  '601',
  '602',
  '603',
  '604',
  '605',
  '606',
  '607',
  '608',
  '702',
  '720',
  '721',
  '723',
  '724',
  '725',
  '728',
  '730',
  '731',
  '732',
  '733',
  '734',
  '736',
  '737',
  '739',
  '770',
  '773',
  '774',
  '775',
  '776',
  '777',
  '790',
  '792',
  '799',
];

export function phoneDigits(f: Faker): string {
  const prefix = f.datatype.boolean(0.85)
    ? f.helpers.arrayElement(MOBILE_PREFIXES)
    : `2${pad(f.number.int({ min: 0, max: 99 }), 2)}`;
  return prefix + pad(f.number.int({ min: 0, max: 999_999 }), 6);
}

export type PhoneFormat = 'intl' | 'intl_compact' | 'grouped' | 'double_zero' | 'compact' | 'pairs';

export function formatPhone(digits: string, format: PhoneFormat): string {
  const g = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  switch (format) {
    case 'intl':
      return `+420 ${g}`;
    case 'intl_compact':
      return `+420${digits}`;
    case 'double_zero':
      return `00420 ${g}`;
    case 'grouped':
      return g;
    case 'compact':
      return digits;
    case 'pairs':
      return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
  }
}

export function psc(f: Faker): string {
  return `${f.number.int({ min: 1, max: 7 })}${pad(f.number.int({ min: 0, max: 99 }), 2)} ${pad(f.number.int({ min: 0, max: 99 }), 2)}`;
}

export function houseNumber(f: Faker): string {
  const popisne = String(f.number.int({ min: 1, max: f.datatype.boolean(0.5) ? 99 : 2999 }));
  if (f.datatype.boolean(0.3)) return `${popisne}/${f.number.int({ min: 1, max: 60 })}`;
  return popisne;
}

/** Formats an amount with spaces as thousands separators: 1250000 → „1 250 000". */
export function amount(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function digits(f: Faker, length: number, firstMin = 1): string {
  return (
    String(f.number.int({ min: firstMin, max: 9 })) +
    Array.from({ length: length - 1 }, () => f.number.int({ min: 0, max: 9 })).join('')
  );
}
