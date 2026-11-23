import { describe, expect, it } from 'vitest';
import { detect, detectCandidates, mergeFindings } from './detect.ts';
import { resolveOverlaps } from './resolve.ts';
import type { Finding, PiiType } from './types.ts';

const today = new Date('2026-11-23T00:00:00Z');
const found = (text: string) => detect(text, { today }).map((f) => [f.type, f.text] as const);
const typesIn = (text: string) => detect(text, { today }).map((f) => f.type);

describe('rodné číslo', () => {
  it('finds it with slash, without slash next to a context word, and as nine digits', () => {
    expect(found('r.č. 850101/1233')).toEqual([['RODNE_CISLO', '850101/1233']]);
    expect(found('rodné číslo 8501011233')).toEqual([['RODNE_CISLO', '8501011233']]);
    expect(found('narozen 530101/123')).toEqual([['RODNE_CISLO', '530101/123']]);
  });

  it('ignores RČ-shaped numbers with a wrong checksum', () => {
    expect(typesIn('číslo smlouvy 8501011234')).toEqual([]);
    expect(typesIn('r.č. 850101/1234')).toEqual([]);
  });

  it('does not report a bare nine-digit number as rodné číslo', () => {
    expect(typesIn('objednávka 605123456 je vyřízena')).not.toContain('RODNE_CISLO');
  });
});

describe('numbers with checksums', () => {
  it('needs a context word for IČO (a valid check digit alone is weak evidence)', () => {
    expect(found('IČO: 00006947')).toEqual([['ICO', '00006947']]);
    expect(typesIn('kód 00006947')).toEqual([]);
  });

  it('reports DIČ instead of the IČO inside it', () => {
    expect(found('DIČ CZ00006947')).toEqual([['DIC', 'CZ00006947']]);
  });

  it('finds bank accounts and IBANs', () => {
    expect(found('Účet 19-2000145399/0800.')).toEqual([['BANK_ACCOUNT', '19-2000145399/0800']]);
    expect(found('IBAN CZ65 0800 0000 1920 0014 5399, děkuji')).toEqual([
      ['IBAN', 'CZ65 0800 0000 1920 0014 5399'],
    ]);
    expect(found('IBAN: CZ6508000000192000145399')).toEqual([['IBAN', 'CZ6508000000192000145399']]);
  });

  it('rejects an account failing mod 11 and a reference number with an unknown "bank code"', () => {
    expect(typesIn('účet 2000145398/0800')).toEqual([]);
    expect(typesIn('spis 2000145399/2026')).toEqual([]);
  });
});

describe('contact data', () => {
  it('finds phones by country code or grouping, not bare amounts', () => {
    expect(found('Volejte +420 605 123 456.')).toEqual([['PHONE', '+420 605 123 456']]);
    expect(found('mobil 605 123 456')).toEqual([['PHONE', '605 123 456']]);
    expect(typesIn('investice 736 028 541 Kč')).toEqual([]);
    expect(typesIn('částka 736 028 541')).toEqual([]);
  });

  it('finds e-mails, also obfuscated ones, without trailing punctuation', () => {
    expect(found('Pište na jan.novak@seznam.cz.')).toEqual([['EMAIL', 'jan.novak@seznam.cz']]);
    expect(found('jan.novak (at) seznam.cz')).toEqual([['EMAIL', 'jan.novak (at) seznam.cz']]);
  });

  it('finds a stand-alone PSČ only with context', () => {
    expect(found('PSČ 60200')).toEqual([['PSC', '60200']]);
    expect(typesIn('kód 60200')).toEqual([]);
  });

  it('finds ID card and passport numbers only after a context word', () => {
    expect(found('OP č. 205123456')).toEqual([['ID_CARD', '205123456']]);
    expect(found('cestovní pas: 41234567')).toEqual([['PASSPORT', '41234567']]);
    expect(typesIn('reference 41234567')).toEqual([]);
  });
});

describe('address', () => {
  it('finds street + number + PSČ + city as one span', () => {
    expect(found('bytem Dlouhá 12, 110 00 Praha 1.')).toEqual([
      ['ADDRESS', 'Dlouhá 12, 110 00 Praha 1'],
    ]);
    expect(found('Adresa: Na Větru 1234/5a, 602 00 Brno-Královo Pole')).toEqual([
      ['ADDRESS', 'Na Větru 1234/5a, 602 00 Brno-Královo Pole'],
    ]);
    expect(found('trvalé bydliště 28. Října 7, 739 61 Třinec')).toEqual([
      ['ADDRESS', '28. Října 7, 739 61 Třinec'],
    ]);
  });

  it('finds multi-word municipalities', () => {
    expect(found('Lipová 3, 400 01 Ústí nad Labem')).toEqual([
      ['ADDRESS', 'Lipová 3, 400 01 Ústí nad Labem'],
    ]);
  });

  it('does not treat a city district („Praha 5") as an address', () => {
    expect(typesIn('pobočka Praha 5 je otevřena')).toEqual([]);
    expect(typesIn('bydlí v Praze 5')).toEqual([]);
  });

  it('wins over a person name inside a street name', () => {
    expect(found('Karla Engliše 12, 150 00 Praha 5')).toEqual([
      ['ADDRESS', 'Karla Engliše 12, 150 00 Praha 5'],
    ]);
  });

  it('does not treat a fund name followed by an amount as an address', () => {
    expect(typesIn('do fondu Alfa 250 000 Kč')).toEqual([]);
  });
});

describe('person names', () => {
  it('finds first name + surname, also declined', () => {
    expect(found('jmenuji se Jan Novák')).toEqual([['PERSON', 'Jan Novák']]);
    expect(found('mluvil jsem s Janem Novákem')).toEqual([['PERSON', 'Janem Novákem']]);
    expect(found('předejte to Lence Dvořákové')).toEqual([['PERSON', 'Lence Dvořákové']]);
  });

  it('finds names after honorifics and titles, without the title', () => {
    expect(found('Vážený pane Nováku,')).toEqual([['PERSON', 'Nováku']]);
    expect(found('Ing. Jiří Hořejší, Ph.D.')).toEqual([['PERSON', 'Jiří Hořejší']]);
    expect(found('volala paní Nováková')).toEqual([['PERSON', 'Nováková']]);
  });

  it('treats surnames equal to ordinary words as names only in a name context', () => {
    expect(found('Petr Nový potvrdil')).toEqual([['PERSON', 'Petr Nový']]);
    expect(found('pan Král souhlasí')).toEqual([['PERSON', 'Král']]);
    expect(typesIn('Nový fond je Král mezi fondy.')).toEqual([]);
  });

  it('does not take „Fond Alfa" for a person', () => {
    expect(typesIn('Doporučujeme fond Alfa a Fond Beta.')).toEqual([]);
  });

  it('finds a feminine surname mid-sentence, but not at the start of a sentence', () => {
    expect(found('dnes volala Svobodová a ptala se')).toEqual([['PERSON', 'Svobodová']]);
    expect(typesIn('Úroková sazba je pevná.')).toEqual([]);
  });

  it('finds a first name alone mid-sentence (vocative)', () => {
    expect(found('Dobrý den, Petře, posílám')).toEqual([['PERSON', 'Petře']]);
  });
});

describe('resolution and options', () => {
  it('returns non-overlapping findings sorted by position', () => {
    const text = 'Jan Novák, r.č. 850101/1233, tel. +420 605 123 456';
    const findings = detect(text, { today });
    for (let i = 1; i < findings.length; i++) {
      expect(findings[i]!.start).toBeGreaterThanOrEqual(findings[i - 1]!.end);
    }
    expect(findings.map((f) => f.type)).toEqual(['PERSON', 'RODNE_CISLO', 'PHONE']);
  });

  it('honours minScore and types', () => {
    const text = 'Jan Novák, tel. 605 123 456';
    expect(detect(text, { today, types: ['PHONE'] }).map((f) => f.type)).toEqual(['PHONE']);
    expect(detect(text, { today, minScore: 0.99 })).toEqual([]);
  });

  it('exposes unresolved candidates including low scores', () => {
    const candidates = detectCandidates('objednávka 605123456', { today });
    expect(candidates.some((c) => c.score < 0.5)).toBe(true);
  });

  it('merges identical spans from different detectors', () => {
    const rule: Finding = {
      type: 'PERSON',
      start: 0,
      end: 9,
      text: 'Jan Novák',
      score: 0.85,
      detector: 'rules',
      reasons: ['first_name_dictionary'],
    };
    const ner: Finding = { ...rule, score: 0.79, detector: 'ner', reasons: ['ner_model'] };
    expect(resolveOverlaps([rule, ner])).toEqual([
      { ...rule, detector: 'rules+ner', reasons: ['first_name_dictionary', 'ner_model'] },
    ]);
  });

  it('lets a plugin finding fill a gap but not displace a stronger rule finding', () => {
    const text = 'Volal Dvořák kvůli účtu 19-2000145399/0800';
    const rules = detect(text, { today });
    const plugin = (start: number, end: number, type: PiiType, score: number): Finding => ({
      type,
      start,
      end,
      text: text.slice(start, end),
      score,
      detector: 'ner',
      reasons: ['ner_model'],
    });
    const merged = mergeFindings(rules, [
      plugin(6, 12, 'PERSON', 0.8),
      plugin(24, 30, 'PERSON', 0.6), // overlaps the account → loses
    ]);
    expect(merged.map((f) => [f.type, f.text])).toEqual([
      ['PERSON', 'Dvořák'],
      ['BANK_ACCOUNT', '19-2000145399/0800'],
    ]);
  });
});
