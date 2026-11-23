import { passesAccountMod11 } from './bank-account.ts';

/**
 * IBAN (ISO 13616): country code, two check digits, BBAN. Valid when the number formed by
 * moving the first four characters to the end and replacing letters with 10–35 is ≡ 1 (mod 97).
 *
 * Czech IBAN: 24 characters = CZ + 2 check digits + 4-digit bank code + 6-digit prefix +
 * 10-digit account number (ČNB, https://www.cnb.cz/cs/platebni-styk/iban/iban-mezinarodni-format-cisla-uctu/;
 * structure set by vyhláška č. 169/2011 Sb.).
 */

/** Lengths we check explicitly; other countries only get the generic length range. */
const COUNTRY_LENGTHS: Readonly<Record<string, number>> = { CZ: 24, SK: 24 };

export function ibanMod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const code = char.charCodeAt(0);
    // Digits stay, letters A–Z become 10–35 (two digits).
    const value = code >= 65 ? String(code - 55) : char;
    for (const digit of value) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder;
}

export interface CzechIbanParts {
  bankCode: string;
  prefix: string;
  number: string;
  /** Both account parts pass the mod-11 check of vyhláška 169/2011 Sb. */
  accountValid: boolean;
}

export type IbanResult =
  | { valid: true; iban: string; country: string; cz?: CzechIbanParts }
  | { valid: false; error: 'format' | 'length' | 'checksum' };

export function normalizeIban(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

export function parseIban(input: string): IbanResult {
  const iban = normalizeIban(input);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return { valid: false, error: 'format' };
  const country = iban.slice(0, 2);
  const expected = COUNTRY_LENGTHS[country];
  if (expected !== undefined && iban.length !== expected) return { valid: false, error: 'length' };
  if (ibanMod97(iban) !== 1) return { valid: false, error: 'checksum' };

  if (country === 'CZ') {
    if (!/^CZ\d{22}$/.test(iban)) return { valid: false, error: 'format' };
    const bankCode = iban.slice(4, 8);
    const prefix = iban.slice(8, 14);
    const number = iban.slice(14);
    const accountValid = passesAccountMod11(prefix) && passesAccountMod11(number);
    return { valid: true, iban, country, cz: { bankCode, prefix, number, accountValid } };
  }
  return { valid: true, iban, country };
}

export function isValidIban(input: string): boolean {
  return parseIban(input).valid;
}
