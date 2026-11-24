import { describe, expect, it } from 'vitest';
import { detect } from './detect.ts';
import { createPseudonymizer, pseudonymize, redact } from './modes.ts';

const today = new Date('2026-11-23T00:00:00Z');
const text =
  'Jan Novák (r.č. 850101/1233) volal z +420 605 123 456. Panu Novákovi jsme poslali návrh, ' +
  'kopii dostala Marie Svobodová. Jan Novák má telefon 00420 605 123 456.';
const findings = detect(text, { today });

describe('redact', () => {
  it('replaces every finding by its type label', () => {
    expect(redact('r.č. 850101/1233', detect('r.č. 850101/1233', { today }))).toBe(
      'r.č. [RODNÉ_ČÍSLO]',
    );
    expect(redact(text, findings)).not.toMatch(/Novák|850101|605/);
  });
});

describe('pseudonymize', () => {
  it('gives the same person the same placeholder across declined forms', () => {
    const out = pseudonymize(text, findings).text;
    expect(out).toBe(
      '<OSOBA_1> (r.č. <RODNÉ_ČÍSLO_1>) volal z <TELEFON_1>. Panu <OSOBA_1> jsme poslali návrh, ' +
        'kopii dostala <OSOBA_2>. <OSOBA_1> má telefon <TELEFON_1>.',
    );
  });

  it('links a surname-only mention seen before the full name', () => {
    const t = 'Pan Novák volal. Jan Novák pak poslal e-mail.';
    expect(pseudonymize(t, detect(t, { today })).text).toBe(
      'Pan <OSOBA_1> volal. <OSOBA_1> pak poslal e-mail.',
    );
  });

  it('keeps two people with the same surname apart', () => {
    const t = 'Jan Novák a Petr Novák jsou bratři.';
    expect(pseudonymize(t, detect(t, { today })).text).toBe('<OSOBA_1> a <OSOBA_2> jsou bratři.');
  });
});

describe('reversible session', () => {
  it('round-trips: pseudonymised text → model answer → re-identified locally', () => {
    const session = createPseudonymizer();
    const { text: masked } = session.pseudonymize(text, findings);
    expect(masked).not.toContain('Novák');

    const modelAnswer = 'Dobrý den, <OSOBA_1>, ověřili jsme číslo <TELEFON_1>.';
    expect(session.reidentify(modelAnswer)).toEqual({
      text: 'Dobrý den, Jan Novák, ověřili jsme číslo +420 605 123 456.',
      restored: 2,
      unknown: [],
    });
  });

  it('reports placeholders the session never issued (e.g. invented by the model)', () => {
    const session = createPseudonymizer();
    session.pseudonymize(text, findings);
    expect(session.reidentify('<OSOBA_7> a <RODNÉ_ČÍSLO_1>')).toEqual({
      text: '<OSOBA_7> a 850101/1233',
      restored: 1,
      unknown: ['<OSOBA_7>'],
    });
  });

  it('never issues a placeholder that already occurs in the input', () => {
    const t = 'Text obsahuje <OSOBA_1> doslova. Jan Novák volal.';
    const session = createPseudonymizer();
    const { text: masked } = session.pseudonymize(t, detect(t, { today }));
    expect(masked).toBe('Text obsahuje <OSOBA_1> doslova. <OSOBA_2> volal.');
    // The literal <OSOBA_1> from the input must not be "restored" into a real name.
    expect(session.reidentify('<OSOBA_1>, <OSOBA_2>').text).toBe('<OSOBA_1>, Jan Novák');
  });

  it('keeps the mapping in memory only and can forget it', () => {
    const session = createPseudonymizer();
    session.pseudonymize(text, findings);
    expect(session.entries().map((e) => e.placeholder)).toEqual([
      '<OSOBA_1>',
      '<RODNÉ_ČÍSLO_1>',
      '<TELEFON_1>',
      '<OSOBA_2>',
    ]);
    expect(JSON.stringify(session)).toBe('{}'); // no enumerable state to serialise by accident
    session.clear();
    expect(session.entries()).toEqual([]);
    expect(session.reidentify('<OSOBA_1>').text).toBe('<OSOBA_1>');
  });
});
