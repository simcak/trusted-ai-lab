/**
 * IČO (identifikační číslo osoby): eight digits, the last one is a weighted mod-11 check digit.
 *
 * TODO(verify) OQ-07: no official description of the algorithm was found on ARES / ČSÚ / SZR
 * pages. The algorithm below is the commonly used one; unit tests check it against public
 * IČO of state institutions (e.g. Ministerstvo financí 00006947, ČNB 48136450).
 */
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2] as const;

export function icoCheckDigit(firstSeven: string): number {
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += Number(firstSeven[i]) * WEIGHTS[i]!;
  const remainder = sum % 11;
  if (remainder === 0) return 1;
  if (remainder === 1) return 0;
  return 11 - remainder;
}

export function isValidIco(input: string): boolean {
  const digits = input.replace(/\s/g, '');
  if (!/^\d{8}$/.test(digits)) return false;
  return icoCheckDigit(digits.slice(0, 7)) === Number(digits[7]);
}
