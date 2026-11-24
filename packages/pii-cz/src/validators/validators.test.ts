import { describe, expect, it } from 'vitest';
import { BANK_CODES_META, bankName, parseBankAccount, passesAccountMod11 } from './bank-account.ts';
import {
  deobfuscateEmail,
  isValidEmail,
  isValidIdCardNumber,
  isValidPassportNumber,
  isValidPsc,
  parsePhone,
} from './contact.ts';
import { parseDic } from './dic.ts';
import { parseIban } from './iban.ts';
import { isValidIco } from './ico.ts';

const today = new Date('2026-11-23T00:00:00Z');

describe('IČO', () => {
  it('accepts a public IČO of a state institution (Ministerstvo financí, mf.gov.cz)', () => {
    expect(isValidIco('00006947')).toBe(true);
  });

  it('handles the remainder edge cases (r = 0 → 1, r = 1 → 0)', () => {
    expect(isValidIco('10316761')).toBe(true); // weighted sum ≡ 0 (mod 11)
    expect(isValidIco('10079190')).toBe(true); // weighted sum ≡ 1 (mod 11)
    expect(isValidIco('10791906')).toBe(true); // regular case, 11 − 5
  });

  it.each(['00006948', '1031676', '103167610', 'abcdefgh', ''])('rejects %j', (input) => {
    expect(isValidIco(input)).toBe(false);
  });
});

describe('DIČ', () => {
  it('validates DIČ built from IČO', () => {
    expect(parseDic('CZ00006947')).toEqual({ valid: true, kind: 'ico', digits: '00006947' });
    expect(parseDic('CZ 00006947')).toMatchObject({ valid: true });
    expect(parseDic('CZ00006948')).toEqual({ valid: false });
  });

  it('validates DIČ built from rodné číslo (9 and 10 digits)', () => {
    expect(parseDic('CZ8501011233', { today })).toMatchObject({ valid: true, kind: 'rodne_cislo' });
    expect(parseDic('CZ530101123', { today })).toMatchObject({ valid: true, kind: 'rodne_cislo' });
    expect(parseDic('CZ8501011234', { today })).toEqual({ valid: false });
  });

  it('accepts the 699 series for persons without rodné číslo (TODO(verify) OQ-08)', () => {
    expect(parseDic('CZ699123456')).toMatchObject({ valid: true, kind: 'special_699' });
  });

  it.each(['00006947', 'SK00006947', 'CZ1234567', 'CZ12345678901'])('rejects %j', (input) => {
    expect(parseDic(input).valid).toBe(false);
  });
});

describe('Czech bank account (vyhláška ČNB 169/2011 Sb.)', () => {
  it('accepts the ČNB example accounts', () => {
    // https://www.cnb.cz/cs/platebni-styk/iban/iban-mezinarodni-format-cisla-uctu/
    expect(parseBankAccount('19-2000145399/0800')).toMatchObject({
      valid: true,
      prefix: '19',
      number: '2000145399',
      bankCode: '0800',
      knownBank: true,
    });
    expect(parseBankAccount('178124-4159/0710')).toMatchObject({ valid: true, knownBank: true });
  });

  it('accepts accounts without prefix and with spaces around separators', () => {
    expect(parseBankAccount('2000145399/0800')).toMatchObject({ valid: true, prefix: undefined });
    expect(parseBankAccount('19 - 2000145399 / 0800')).toMatchObject({ valid: true });
  });

  it('rejects a failed mod-11 check in either part', () => {
    expect(parseBankAccount('2000145398/0800')).toEqual({
      valid: false,
      error: 'number_checksum',
    });
    expect(parseBankAccount('18-2000145399/0800')).toEqual({
      valid: false,
      error: 'prefix_checksum',
    });
  });

  it('flags bank codes missing from the ČNB list', () => {
    expect(parseBankAccount('2000145399/9999')).toMatchObject({ valid: true, knownBank: false });
    expect(bankName('0800')).toBe('Česká spořitelna, a.s.');
    expect(BANK_CODES_META.count).toBeGreaterThan(0);
  });

  it.each(['0000000000/0800', '2000145399/080', '2000145399', '12345678901/0800'])(
    'rejects malformed %j',
    (input) => {
      expect(parseBankAccount(input).valid).toBe(false);
    },
  );

  it('implements the weights from the right (1, 2, 4, 8, 5, 10, 9, 7, 3, 6)', () => {
    expect(passesAccountMod11('11')).toBe(false); // 1·1 + 1·2 = 3
    expect(passesAccountMod11('0000000019')).toBe(true); // 9·1 + 1·2 = 11
  });
});

describe('IBAN', () => {
  it('accepts the ČNB examples and splits the Czech BBAN', () => {
    expect(parseIban('CZ6508000000192000145399')).toEqual({
      valid: true,
      iban: 'CZ6508000000192000145399',
      country: 'CZ',
      cz: { bankCode: '0800', prefix: '000019', number: '2000145399', accountValid: true },
    });
    expect(parseIban('CZ69 0710 1781 2400 0000 4159')).toMatchObject({ valid: true });
  });

  it('rejects a wrong check digit, wrong length and garbage', () => {
    expect(parseIban('CZ6608000000192000145399')).toEqual({ valid: false, error: 'checksum' });
    expect(parseIban('CZ650800000019200014539')).toEqual({ valid: false, error: 'length' });
    expect(parseIban('CZXX08000000192000145399')).toEqual({ valid: false, error: 'format' });
  });

  it('accepts other countries by the generic mod-97 rule', () => {
    // The widely used textbook example IBAN (e.g. Wikipedia, "International Bank Account Number").
    expect(parseIban('GB82 WEST 1234 5698 7654 32')).toMatchObject({ valid: true, country: 'GB' });
  });
});

describe('phone', () => {
  it.each([
    ['+420 605 123 456', true],
    ['00420605123456', true],
    ['605 123 456', false],
    ['605-123-456', false],
    ['(+420) 605 123 456', true],
  ])('parses %j (country code: %s)', (input, hasCountryCode) => {
    expect(parsePhone(input)).toEqual({ national: '605123456', hasCountryCode });
  });

  it.each(['105 123 456', '005 123 456', '605 123 45', '+421 605 123 456'])(
    'rejects %j',
    (input) => {
      expect(parsePhone(input)).toBeUndefined();
    },
  );
});

describe('e-mail', () => {
  it.each(['jan.novak@seznam.cz', 'j+tag@sub.example.com', 'Gothard.Zemanek3@atlas.cz'])(
    'accepts %j',
    (input) => {
      expect(isValidEmail(input)).toBe(true);
    },
  );

  it.each(['jan..novak@seznam.cz', '.jan@seznam.cz', 'jan@seznam', 'jan@-seznam.cz', 'jan@'])(
    'rejects %j',
    (input) => {
      expect(isValidEmail(input)).toBe(false);
    },
  );

  it('de-obfuscates (at) / [zavináč] notations', () => {
    expect(deobfuscateEmail('jan.novak (at) seznam.cz')).toBe('jan.novak@seznam.cz');
    expect(deobfuscateEmail('jan.novak[zavináč]seznam(tečka)cz')).toBe('jan.novak@seznam.cz');
  });
});

describe('PSČ and document numbers', () => {
  it('accepts PSČ with and without the space', () => {
    expect(isValidPsc('110 00')).toBe(true);
    expect(isValidPsc('60200')).toBe(true);
    expect(isValidPsc('010 01')).toBe(false); // Slovak range (TODO(verify) OQ-10)
    expect(isValidPsc('110 0')).toBe(false);
  });

  it('checks the digit count of ID card and passport numbers', () => {
    expect(isValidIdCardNumber('205123456')).toBe(true);
    expect(isValidIdCardNumber('20512345')).toBe(false);
    expect(isValidPassportNumber('41234567')).toBe(true);
    expect(isValidPassportNumber('412345678')).toBe(false);
  });
});
