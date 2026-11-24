import { describe, expect, it } from 'vitest';
import { evaluate, type EvalCase } from './eval.ts';

const text = 'Jan Novák, tel. 605 123 456, r.č. 850101/1233.';
const person = { start: 0, end: 9, type: 'PERSON' } as const;
const phone = { start: 16, end: 27, type: 'PHONE' } as const;
const rc = { start: 34, end: 45, type: 'RODNE_CISLO' } as const;

describe('evaluate', () => {
  it('computes strict precision / recall / F1 per type and micro-averaged', () => {
    const cases: EvalCase[] = [
      {
        id: 'd1',
        text,
        gold: [person, phone, rc],
        // person exact, phone partial (overlap only), rc missed, one spurious
        predicted: [
          person,
          { start: 20, end: 27, type: 'PHONE' },
          { start: 11, end: 14, type: 'PERSON' },
        ],
      },
    ];
    const r = evaluate(cases, { types: ['PERSON', 'PHONE', 'RODNE_CISLO'] });
    expect(r.perType.PERSON).toMatchObject({
      support: 1,
      predicted: 2,
      tp: 1,
      fp: 1,
      fn: 0,
      strict: { precision: 0.5, recall: 1, f1: 0.6667 },
    });
    expect(r.perType.PHONE.strict).toEqual({ precision: 0, recall: 0, f1: 0 });
    expect(r.perType.PHONE.overlap).toEqual({ tp: 1, precision: 1, recall: 1, f1: 1 });
    expect(r.perType.RODNE_CISLO.strict).toEqual({ precision: null, recall: 0, f1: null });
    expect(r.micro).toMatchObject({ support: 3, predicted: 3, tp: 1 });
  });

  it('measures leakage regardless of the predicted type', () => {
    const cases: EvalCase[] = [
      {
        id: 'd1',
        text,
        gold: [person, phone, rc],
        // rc masked as the wrong type: still not leaked; phone half-covered; person missed
        predicted: [
          { ...rc, type: 'PHONE' },
          { start: 16, end: 20, type: 'PHONE' },
        ],
      },
    ];
    const { leakage } = evaluate(cases);
    expect(leakage).toMatchObject({ goldSpans: 3, leakedSpans: 1, partialSpans: 1 });
    expect(leakage.goldChars).toBe(8 + 9 + 11); // whitespace is not counted
    expect(leakage.leakedChars).toBe(8 + 6);
  });

  it('collects error examples with notes and a marked context, capped per type', () => {
    const cases: EvalCase[] = [
      { id: 'd1', text, gold: [person, rc], predicted: [{ ...rc, type: 'PHONE' }] },
    ];
    const { errors } = evaluate(cases, { maxErrorsPerType: 1 });
    expect(errors).toContainEqual(
      expect.objectContaining({
        kind: 'false_negative',
        type: 'PERSON',
        note: 'missed',
        span: 'Jan Novák',
      }),
    );
    expect(errors).toContainEqual(
      expect.objectContaining({
        kind: 'false_negative',
        type: 'RODNE_CISLO',
        note: 'wrong_type',
        otherType: 'PHONE',
      }),
    );
    const fp = errors.find((e) => e.kind === 'false_positive');
    expect(fp?.context).toContain('⟦850101/1233⟧');
  });
});
