/**
 * Rodné číslo (Czech birth number) validation.
 *
 * Source: zákon č. 133/2000 Sb., o evidenci obyvatel, § 13 (consolidated text as of 2025-01-01,
 * https://e-sbirka.gov.cz/sb/2000/133) and https://mv.gov.cz/rodne-cislo-obecne:
 * - YYMMDD + suffix; women have the month increased by 50 (§ 13 odst. 3).
 * - Ten digits, divisible by 11 without remainder (§ 13 odst. 3).
 * - Persons born before 1 January 1954: nine digits with a three-digit suffix; no divisibility
 *   condition (§ 13 odst. 4). A three-digit suffix 000 is not a valid rodné číslo (MV).
 * - Supplementary series when a day's numbers run out: month +20 for men, +70 for women
 *   (§ 13 odst. 5).
 *
 * Not stated by the law, implemented from common practice and tracked in docs/OPEN_QUESTIONS.md:
 * - TODO(verify) OQ-05: numbers issued until 1985 whose first nine digits give remainder 10
 *   (mod 11) carry check digit 0 and are not divisible by 11.
 * - TODO(verify) OQ-06: the supplementary series (+20 / +70) is used from 2004 on.
 */

export type Sex = 'M' | 'F';

export interface RodneCisloValid {
  valid: true;
  /** Digits only, without the slash. */
  digits: string;
  length: 9 | 10;
  birthDate: { year: number; month: number; day: number };
  sex: Sex;
  /** Month increased by 20 / 70 (§ 13 odst. 5). */
  supplementary: boolean;
  /** Accepted through the remainder-10 exception (TODO(verify) OQ-05). */
  remainder10Exception: boolean;
}

export type RodneCisloError =
  | 'format'
  | 'zero_suffix'
  | 'month'
  | 'supplementary_before_2004'
  | 'date'
  | 'future_date'
  | 'checksum';

export interface RodneCisloInvalid {
  valid: false;
  error: RodneCisloError;
}

export type RodneCisloResult = RodneCisloValid | RodneCisloInvalid;

/** Last year in which the remainder-10 exception was applied. TODO(verify) OQ-05. */
export const REMAINDER_10_LAST_YEAR = 1985;
/** First year of the supplementary series (+20 / +70). TODO(verify) OQ-06. */
export const SUPPLEMENTARY_FIRST_YEAR = 2004;

const FORMAT = /^(\d{2})(\d{2})(\d{2})\s?\/?\s?(\d{3,4})$/;

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Parses and validates a rodné číslo written as `YYMMDD/XXXX`, `YYMMDDXXXX` or the nine-digit
 * pre-1954 form `YYMMDD/XXX`.
 */
export function parseRodneCislo(input: string, options: { today?: Date } = {}): RodneCisloResult {
  const match = FORMAT.exec(input.trim());
  if (!match) return { valid: false, error: 'format' };
  const [, yy = '', mm = '', dd = '', suffix = ''] = match;
  const length = (6 + suffix.length) as 9 | 10;

  if (length === 9 && suffix === '000') return { valid: false, error: 'zero_suffix' };

  const yearTwoDigits = Number(yy);
  // Ten digits: 1954–2053. Nine digits: born before 1954 → 1900–1953, or 1854–1899.
  const year =
    length === 10
      ? yearTwoDigits >= 54
        ? 1900 + yearTwoDigits
        : 2000 + yearTwoDigits
      : yearTwoDigits <= 53
        ? 1900 + yearTwoDigits
        : 1800 + yearTwoDigits;

  const rawMonth = Number(mm);
  let month: number;
  let sex: Sex;
  let supplementary = false;
  if (rawMonth > 70) [month, sex, supplementary] = [rawMonth - 70, 'F', true];
  else if (rawMonth > 50) [month, sex] = [rawMonth - 50, 'F'];
  else if (rawMonth > 20) [month, sex, supplementary] = [rawMonth - 20, 'M', true];
  else [month, sex] = [rawMonth, 'M'];
  if (month < 1 || month > 12) return { valid: false, error: 'month' };
  if (supplementary && (length === 9 || year < SUPPLEMENTARY_FIRST_YEAR)) {
    return { valid: false, error: 'supplementary_before_2004' };
  }

  const day = Number(dd);
  if (day < 1 || day > daysInMonth(year, month)) return { valid: false, error: 'date' };

  const today = options.today ?? new Date();
  if (Date.UTC(year, month - 1, day) > today.getTime()) {
    return { valid: false, error: 'future_date' };
  }

  const digits = `${yy}${mm}${dd}${suffix}`;
  let remainder10Exception = false;
  if (length === 10) {
    if (Number(digits) % 11 !== 0) {
      const firstNine = Number(digits.slice(0, 9));
      const checkDigit = Number(digits[9]);
      if (firstNine % 11 === 10 && checkDigit === 0 && year <= REMAINDER_10_LAST_YEAR) {
        remainder10Exception = true;
      } else {
        return { valid: false, error: 'checksum' };
      }
    }
  }

  return {
    valid: true,
    digits,
    length,
    birthDate: { year, month, day },
    sex,
    supplementary,
    remainder10Exception,
  };
}

export function isValidRodneCislo(input: string, options?: { today?: Date }): boolean {
  return parseRodneCislo(input, options).valid;
}
