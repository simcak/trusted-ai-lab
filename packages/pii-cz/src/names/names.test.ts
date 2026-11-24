import { describe, expect, it } from 'vitest';
import { FIRST_NAMES_META, matchFirstName } from './dictionary.ts';
import { firstNameCandidates, surnameKey } from './inflection.ts';
import { personKey } from './person.ts';

describe('firstNameCandidates', () => {
  it.each([
    ['janovi', 'jan'],
    ['petrem', 'petr'],
    ['pavlovi', 'pavel'],
    ['markovi', 'marek'],
    ['zdeňkovi', 'zdeněk'],
    ['jiřímu', 'jiří'],
    ['lence', 'lenka'],
    ['marii', 'marie'],
    ['evě', 'eva'],
    ['petře', 'petr'],
    ['olze', 'olga'],
    ['kateřino', 'kateřina'],
  ])('%s → %s', (form, lemma) => {
    expect(firstNameCandidates(form)).toContain(lemma);
  });
});

describe('matchFirstName (MV list)', () => {
  it('matches exact and declined forms with their group', () => {
    // The MV list files Jan under NEUTRALNI.
    expect(matchFirstName('Jan')).toEqual({ lemma: 'jan', group: 'neutral', inflected: false });
    expect(matchFirstName('Petr')).toEqual({ lemma: 'petr', group: 'male', inflected: false });
    expect(matchFirstName('Janem')).toMatchObject({ lemma: 'jan', inflected: true });
    expect(matchFirstName('Lence')).toMatchObject({ lemma: 'lenka', group: 'female' });
  });

  it('excludes words that are also common nouns or fund names', () => {
    expect(matchFirstName('Alfa')).toBeUndefined();
    expect(matchFirstName('Naděje')).toBeUndefined();
  });

  it('does not match ordinary words, including those the MV list contains', () => {
    for (const word of ['Fond', 'Dobrý', 'Ale', 'Pak', 'To', 'Do', 'My', 'Jak']) {
      expect(matchFirstName(word), word).toBeUndefined();
    }
  });

  it('carries provenance of the dictionary', () => {
    expect(FIRST_NAMES_META.publisher).toBe('Ministerstvo vnitra České republiky');
    expect(FIRST_NAMES_META.count).toBeGreaterThan(10_000);
  });
});

describe('surnameKey', () => {
  it.each([
    [['Novák', 'Nováka', 'Novákovi', 'Novákem', 'Nováku'], 'novák'],
    [['Nováková', 'Novákové', 'Novákovou'], 'nováková'],
    [['Černý', 'Černého', 'Černému', 'Černým'], 'černý'],
    [['Svoboda', 'Svobody', 'Svobodovi', 'Svobodou'], 'svobod'],
    [['Hájek', 'Hájka', 'Hájkovi'], 'hájk'],
    [['Němec', 'Němce', 'Němcovi'], 'němc'],
  ])('%j → %s', (forms, key) => {
    for (const form of forms) expect(surnameKey(form), form).toBe(key);
  });

  it('keeps masculine and feminine forms apart', () => {
    expect(surnameKey('Novák')).not.toBe(surnameKey('Nováková'));
  });
});

describe('personKey', () => {
  it('splits first name and surname', () => {
    expect(personKey('Jan Novák')).toEqual({ first: 'jan', surname: 'novák' });
    expect(personKey('Janu Novákovi')).toEqual({ first: 'jan', surname: 'novák' });
    expect(personKey('Novák')).toEqual({ surname: 'novák' });
    expect(personKey('Petře')).toEqual({ first: 'petr' });
  });
});
