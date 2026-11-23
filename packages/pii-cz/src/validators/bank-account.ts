import bankCodes from '../data/bank-codes.json' with { type: 'json' };

/**
 * Czech bank account `[předčíslí-]číslo/kód banky`.
 *
 * Source: vyhláška ČNB č. 169/2011 Sb., příloha — both parts of the account identifier pass a
 * weighted mod-11 check; weights are assigned from the right: 1, 2, 4, 8, 5, 10, 9, 7, 3, 6.
 * Bank codes: ČNB „Číselník kódů bank" (see src/data/bank-codes.json for list number and date).
 */
const WEIGHTS_FROM_RIGHT = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6] as const;

const KNOWN_BANK_CODES: ReadonlyMap<string, string> = new Map(
  bankCodes.codes.map((c) => [c.code, c.name]),
);

export const BANK_CODES_META = {
  title: bankCodes.title,
  validFrom: bankCodes.validFrom,
  retrievedAt: bankCodes.retrievedAt,
  source: bankCodes.source,
  count: bankCodes.codes.length,
} as const;

/** True when the digits pass the weighted mod-11 check of vyhláška 169/2011 Sb. */
export function passesAccountMod11(digits: string): boolean {
  if (!/^\d+$/.test(digits) || digits.length > WEIGHTS_FROM_RIGHT.length) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += Number(digits[digits.length - 1 - i]) * WEIGHTS_FROM_RIGHT[i]!;
  }
  return sum % 11 === 0;
}

export function bankName(code: string): string | undefined {
  return KNOWN_BANK_CODES.get(code);
}

export interface BankAccount {
  prefix: string | undefined;
  number: string;
  bankCode: string;
}

export type BankAccountResult =
  | (BankAccount & { valid: true; knownBank: boolean })
  | { valid: false; error: 'format' | 'prefix_checksum' | 'number_checksum' };

const FORMAT = /^(?:(\d{1,6})\s?-\s?)?(\d{2,10})\s?\/\s?(\d{4})$/;

export function parseBankAccount(input: string): BankAccountResult {
  const match = FORMAT.exec(input.trim());
  if (!match) return { valid: false, error: 'format' };
  const [, prefix, number = '', bankCode = ''] = match;
  if (/^0+$/.test(number)) return { valid: false, error: 'format' };
  if (prefix !== undefined && !passesAccountMod11(prefix)) {
    return { valid: false, error: 'prefix_checksum' };
  }
  if (!passesAccountMod11(number)) return { valid: false, error: 'number_checksum' };
  return { valid: true, prefix, number, bankCode, knownBank: KNOWN_BANK_CODES.has(bankCode) };
}

export function isValidBankAccount(input: string): boolean {
  return parseBankAccount(input).valid;
}
