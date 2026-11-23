import { isValidIco } from './ico.ts';
import { isValidRodneCislo } from './rodne-cislo.ts';

/**
 * DIČ (daňové identifikační číslo) in the form CZ + 8–10 digits:
 * - 8 digits: IČO of a legal entity → IČO check digit;
 * - 9–10 digits: rodné číslo of a natural person → rodné číslo validation;
 * - TODO(verify) OQ-08: CZ699xxxxxx is used for persons without a rodné číslo (9 digits,
 *   no further check known).
 */
export type DicKind = 'ico' | 'rodne_cislo' | 'special_699';

export type DicResult = { valid: true; kind: DicKind; digits: string } | { valid: false };

export function parseDic(input: string, options?: { today?: Date }): DicResult {
  const match = /^CZ\s?(\d{8,10})$/i.exec(input.trim());
  if (!match) return { valid: false };
  const digits = match[1]!;
  if (digits.length === 8) {
    return isValidIco(digits) ? { valid: true, kind: 'ico', digits } : { valid: false };
  }
  if (digits.length === 9 && digits.startsWith('699')) {
    return { valid: true, kind: 'special_699', digits };
  }
  const rc = `${digits.slice(0, 6)}/${digits.slice(6)}`;
  return isValidRodneCislo(rc, options)
    ? { valid: true, kind: 'rodne_cislo', digits }
    : { valid: false };
}

export function isValidDic(input: string, options?: { today?: Date }): boolean {
  return parseDic(input, options).valid;
}
