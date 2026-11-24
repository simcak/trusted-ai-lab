/**
 * Phone, e-mail, PSČ and identity-document number formats.
 *
 * These have no checksum, so detectors combine the format with context words.
 * - Phone: +420 / 00420 optional, nine national digits. TODO(verify) OQ-10: first digit 2–9
 *   (ČTÚ numbering plan; 0 and 1 are not used for subscriber numbers).
 * - PSČ: five digits, conventionally written `123 45`. TODO(verify) OQ-10: Czech codes start
 *   with 1–7.
 * - ID card / passport: TODO(verify) OQ-09: 9 digits (občanský průkaz) and 8 digits (cestovní
 *   pas); only reported next to a context word.
 */

export interface PhoneNumber {
  national: string;
  hasCountryCode: boolean;
}

export function parsePhone(input: string): PhoneNumber | undefined {
  const compact = input.replace(/[\s().-]/g, '');
  const match = /^(?:(\+|00)420)?(\d{9})$/.exec(compact);
  if (!match) return undefined;
  const national = match[2]!;
  if (!/^[2-9]/.test(national)) return undefined;
  return { national, hasCountryCode: match[1] !== undefined };
}

export function isValidPhone(input: string): boolean {
  return parsePhone(input) !== undefined;
}

const EMAIL =
  /^([A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*)@((?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24})$/;

/** Deliberately stricter than RFC 5322: dot-atom local part, LDH domain labels, alphabetic TLD. */
export function isValidEmail(input: string): boolean {
  const value = input.trim();
  return value.length <= 254 && EMAIL.test(value);
}

/** Turns `jan.novak (at) seznam.cz` / `jan.novak[zavináč]seznam.cz` into a plain address. */
export function deobfuscateEmail(input: string): string {
  return input
    .replace(/\s*[([{]\s*(?:at|zavináč|zavinac)\s*[)\]}]\s*/gi, '@')
    .replace(/\s+(?:zavináč|zavinac)\s+/gi, '@')
    .replace(/\s*[([{]\s*(?:dot|tečka|tecka)\s*[)\]}]\s*/gi, '.');
}

export function isValidPsc(input: string): boolean {
  return /^[1-7]\d{2}\s?\d{2}$/.test(input.trim());
}

export function isValidIdCardNumber(input: string): boolean {
  return /^\d{9}$/.test(input.trim());
}

export function isValidPassportNumber(input: string): boolean {
  return /^\d{8}$/.test(input.trim());
}
