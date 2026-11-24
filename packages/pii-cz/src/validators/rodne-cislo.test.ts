import { describe, expect, it } from 'vitest';
import { parseRodneCislo, type RodneCisloResult } from './rodne-cislo.ts';

// Fixed reference date so "future birth date" cases do not change over time.
const today = new Date('2026-11-23T00:00:00Z');
const parse = (input: string) => parseRodneCislo(input, { today });
const errorOf = (r: RodneCisloResult) => (r.valid ? 'valid' : r.error);

describe('parseRodneCislo — ten digits', () => {
  it('accepts a male number with and without the slash', () => {
    for (const input of ['850101/1233', '8501011233', '850101 1233', '850101 / 1233']) {
      const r = parse(input);
      expect(r, input).toMatchObject({
        valid: true,
        digits: '8501011233',
        length: 10,
        sex: 'M',
        birthDate: { year: 1985, month: 1, day: 1 },
        supplementary: false,
        remainder10Exception: false,
      });
    }
  });

  it('decodes women (month + 50)', () => {
    expect(parse('855101/1238')).toMatchObject({
      valid: true,
      sex: 'F',
      birthDate: { year: 1985, month: 1, day: 1 },
    });
  });

  it('rejects a wrong check digit (number not divisible by 11)', () => {
    expect(errorOf(parse('850101/1234'))).toBe('checksum');
    expect(errorOf(parse('8501011234'))).toBe('checksum');
  });

  it('maps YY >= 54 to 19YY and YY <= 53 to 20YY', () => {
    expect(parse('540101/0010')).toMatchObject({ valid: true, birthDate: { year: 1954 } });
    // 2053 is in the future → rejected rather than read as 1953.
    expect(errorOf(parse('530101/0011'))).toBe('future_date');
  });

  it('rejects birth dates after the reference date', () => {
    expect(parse('260101/0016')).toMatchObject({ valid: true, birthDate: { year: 2026 } });
    expect(errorOf(parse('261231/0019'))).toBe('future_date');
  });

  describe('remainder-10 exception (TODO(verify) OQ-05)', () => {
    it('accepts check digit 0 when the first nine digits give remainder 10, up to 1985', () => {
      expect(Number('850101009') % 11).toBe(10);
      expect(parse('850101/0090')).toMatchObject({ valid: true, remainder10Exception: true });
    });

    it('rejects the same construction from 1986 on', () => {
      expect(Number('860101010') % 11).toBe(10);
      expect(errorOf(parse('860101/0100'))).toBe('checksum');
    });
  });

  describe('supplementary series, month + 20 / + 70 (§ 13 odst. 5)', () => {
    it('accepts men +20 and women +70 from 2004 (TODO(verify) OQ-06)', () => {
      expect(parse('042101/0018')).toMatchObject({
        valid: true,
        sex: 'M',
        supplementary: true,
        birthDate: { year: 2004, month: 1, day: 1 },
      });
      expect(parse('047101/0012')).toMatchObject({
        valid: true,
        sex: 'F',
        supplementary: true,
        birthDate: { year: 2004, month: 1, day: 1 },
      });
    });

    it('rejects the supplementary series before 2004', () => {
      expect(errorOf(parse('032101/0019'))).toBe('supplementary_before_2004');
    });
  });

  it.each([
    ['851301/0011', 'month 13'],
    ['853301/0013', 'month 33 (13 + 20)'],
    ['856301/0016', 'month 63 (13 + 50)'],
    ['858301/0018', 'month 83 (13 + 70)'],
    ['850001/0013', 'month 00'],
  ])('rejects invalid month %s (%s)', (input) => {
    expect(errorOf(parse(input))).toBe('month');
  });

  it('validates the day against the month and leap years', () => {
    expect(errorOf(parse('850132/0014'))).toBe('date'); // 32 January
    expect(errorOf(parse('855431/0017'))).toBe('date'); // 31 April (woman)
    expect(parse('000229/0013')).toMatchObject({ valid: true, birthDate: { year: 2000 } }); // 2000 is leap
    expect(parse('005229/0018')).toMatchObject({ valid: true, sex: 'F' });
    expect(errorOf(parse('010229/0012'))).toBe('date'); // 2001 is not leap
  });
});

describe('parseRodneCislo — nine digits (born before 1954, § 13 odst. 4)', () => {
  it('accepts nine digits without any divisibility check', () => {
    const r = parse('530101/123');
    expect(r).toMatchObject({ valid: true, length: 9, birthDate: { year: 1953 } });
    expect(Number('530101123') % 11).not.toBe(0);
  });

  it('reads YY >= 54 in nine-digit numbers as the 19th century', () => {
    expect(parse('991231/123')).toMatchObject({ valid: true, birthDate: { year: 1899 } });
  });

  it('rejects the three-digit suffix 000 (MV: not a rodné číslo)', () => {
    expect(errorOf(parse('530101/000'))).toBe('zero_suffix');
  });

  it('checks 29 February in 1900 (not a leap year)', () => {
    expect(errorOf(parse('000229/123'))).toBe('date');
  });

  it('does not allow the supplementary series', () => {
    expect(errorOf(parse('532101/123'))).toBe('supplementary_before_2004');
  });
});

describe('parseRodneCislo — format', () => {
  it.each(['', '85010/1233', '850101/12', '850101/12345', '85O101/1233', '850101-1233'])(
    'rejects %j',
    (input) => {
      expect(errorOf(parse(input))).toBe('format');
    },
  );
});
