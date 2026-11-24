import { describe, expect, it } from 'vitest';
import { detect, detectAsync } from './detect.ts';
import { createNerDetector, type NerToken } from './ner.ts';

const today = new Date('2026-11-23T00:00:00Z');

/** Shapes copied from real transformers.js 4.3 output for this model (lower-cased word pieces). */
const fake = (tokens: NerToken[]) => () => Promise.resolve(tokens);

describe('createNerDetector', () => {
  it('aligns lower-cased word pieces to the original text and joins them', async () => {
    const text = 'Posílám to panu Petrovi Dvořákovi.';
    const ner = createNerDetector(
      fake([
        { entity: 'B-PER', score: 0.99, index: 4, word: 'petro' },
        { entity: 'I-PER', score: 0.99, index: 5, word: '##vi' },
        { entity: 'I-PER', score: 0.99, index: 6, word: 'dvořák' },
        { entity: 'I-PER', score: 0.99, index: 7, word: '##ovi' },
      ]),
    );
    expect(await ner(text)).toEqual([
      {
        type: 'PERSON',
        start: 16,
        end: 33,
        text: 'Petrovi Dvořákovi',
        score: 0.79,
        detector: 'ner',
        reasons: ['ner_model'],
      },
    ]);
  });

  it('trims honorifics and titles the model includes', async () => {
    const text = 'Volala paní Nováková. Ing. Jiří Hořejší přijde.';
    const ner = createNerDetector(
      fake([
        { entity: 'B-PER', score: 0.99, index: 2, word: 'paní' },
        { entity: 'I-PER', score: 0.99, index: 3, word: 'novák' },
        { entity: 'I-PER', score: 0.99, index: 4, word: '##ová' },
        { entity: 'B-PER', score: 0.6, index: 6, word: 'ing' },
        { entity: 'I-PER', score: 0.84, index: 8, word: 'jiří' },
        { entity: 'I-PER', score: 0.99, index: 9, word: 'hoře' },
        { entity: 'I-PER', score: 0.99, index: 10, word: '##jší' },
      ]),
    );
    expect((await ner(text)).map((f) => f.text)).toEqual(['Nováková', 'Jiří Hořejší']);
  });

  it('ignores other labels and low-confidence tokens', async () => {
    const text = 'Jan bydlí v Ústí nad Labem.';
    const ner = createNerDetector(
      fake([
        { entity: 'B-PER', score: 0.3, index: 1, word: 'jan' },
        { entity: 'B-LOC', score: 0.99, index: 4, word: 'ústí' },
      ]),
    );
    expect(await ner(text)).toEqual([]);
  });

  it('matches without diacritics and skips tokens it cannot place', async () => {
    const text = 'Zdravím, Šárka Malá.';
    const ner = createNerDetector(
      fake([
        { entity: 'B-PER', score: 0.9, index: 3, word: 'sarka' },
        { entity: 'I-PER', score: 0.9, index: 4, word: 'mala' },
        { entity: 'B-PER', score: 0.9, index: 9, word: 'neexistuje' },
      ]),
    );
    expect((await ner(text)).map((f) => f.text)).toEqual(['Šárka Malá']);
  });

  it('adds names the rules miss when merged by detectAsync', async () => {
    const text = 'Dvořák volal včera.';
    expect(detect(text, { today })).toEqual([]);
    const ner = createNerDetector(
      fake([{ entity: 'B-PER', score: 0.95, index: 1, word: 'dvořák' }]),
    );
    const findings = await detectAsync(text, [ner], { today });
    expect(findings.map((f) => [f.text, f.detector])).toEqual([['Dvořák', 'ner']]);
  });
});
