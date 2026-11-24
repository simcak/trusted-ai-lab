import { describe, expect, it } from 'vitest';
import { estimateCost, PricingSchema, type Pricing } from './cost.ts';

/** Round numbers so the arithmetic is checkable by hand. Not real prices. */
const FIXTURE: Pricing = {
  schemaVersion: 1,
  currency: 'USD',
  unit: 'per_1m_tokens',
  note: 'test fixture',
  providers: [
    {
      id: 'a',
      name: 'A',
      source: 'https://example.test/a',
      retrievedAt: '2026-01-01',
      batchMultiplier: 0.5,
      models: [
        { model: 'a-small', tier: 'small', inputUsd: 1, outputUsd: 2 },
        { model: 'a-medium', tier: 'medium', inputUsd: null, outputUsd: null },
        { model: 'a-large', tier: 'large', inputUsd: 10, outputUsd: 20, promptTokensUpTo: 2_000 },
      ],
    },
    {
      id: 'b',
      name: 'B',
      source: 'https://example.test/b',
      retrievedAt: '2026-01-01',
      batchMultiplier: null,
      models: [{ model: 'b-small', tier: 'small', inputUsd: 2, outputUsd: 4 }],
    },
  ],
};

describe('estimateCost', () => {
  it('multiplies requests × tokens × price for the low and the high end', () => {
    const cost = estimateCost('llm', 'hundreds', 'interactive', FIXTURE);
    if (cost.kind !== 'estimate') throw new Error('expected an estimate');
    const small = cost.tiers.find((t) => t.tier === 'small');
    // llm: 1 000–4 000 in, 200–1 000 out; 100–1 000 requests.
    // A: 100 × (1 000×1 + 200×2)/1e6 = 0.14; B: 1 000 × (4 000×2 + 1 000×4)/1e6 = 12.
    expect(small?.monthlyUsd?.min).toBeCloseTo(0.14, 10);
    expect(small?.monthlyUsd?.max).toBeCloseTo(12, 10);
    expect(small?.models).toEqual([
      { provider: 'A', model: 'a-small' },
      { provider: 'B', model: 'b-small' },
    ]);
  });

  it('applies the batch multiplier only where the provider has one', () => {
    const cost = estimateCost('llm', 'hundreds', 'batch', FIXTURE);
    if (cost.kind !== 'estimate') throw new Error('expected an estimate');
    expect(cost.batch).toBe(true);
    const small = cost.tiers.find((t) => t.tier === 'small');
    expect(small?.monthlyUsd?.min).toBeCloseTo(0.07, 10); // A, halved
    expect(small?.monthlyUsd?.max).toBeCloseTo(12, 10); // B, no batch price
  });

  it('leaves a tier empty when its price is a placeholder', () => {
    const cost = estimateCost('rag', 'thousands', 'interactive', FIXTURE);
    if (cost.kind !== 'estimate') throw new Error('expected an estimate');
    expect(cost.tiers.find((t) => t.tier === 'medium')).toEqual({
      tier: 'medium',
      monthlyUsd: null,
      models: [],
    });
  });

  it('skips a model whose price does not cover the assumed prompt length', () => {
    const cost = estimateCost('agent', 'thousands', 'interactive', FIXTURE);
    if (cost.kind !== 'estimate') throw new Error('expected an estimate');
    expect(cost.tiers.find((t) => t.tier === 'large')?.monthlyUsd).toBeNull();
  });

  it('does not estimate patterns without a language model', () => {
    expect(estimateCost('no-ai', 'thousands', 'interactive', FIXTURE)).toEqual({
      kind: 'no-tokens',
    });
    expect(estimateCost('classic-software', 'thousands', 'interactive', FIXTURE).kind).toBe(
      'no-tokens',
    );
    expect(estimateCost('human-in-the-loop', 'thousands', 'interactive', FIXTURE).kind).toBe(
      'no-tokens',
    );
    expect(estimateCost('classic-ml', 'thousands', 'interactive', FIXTURE)).toEqual({
      kind: 'not-token-based',
    });
  });
});

describe('PricingSchema', () => {
  it('accepts the fixture', () => {
    expect(PricingSchema.safeParse(FIXTURE).success).toBe(true);
  });

  it('refuses prices without a source and retrieval date', () => {
    const [first] = FIXTURE.providers;
    if (!first) throw new Error('fixture');
    const bad = { ...FIXTURE, providers: [{ ...first, source: null }] };
    expect(PricingSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts a provider made only of placeholders', () => {
    const placeholder = {
      ...FIXTURE,
      providers: [
        {
          id: 'x',
          name: 'X',
          source: null,
          retrievedAt: null,
          batchMultiplier: null,
          models: [{ model: 'x', tier: 'small', inputUsd: null, outputUsd: null }],
        },
      ],
    };
    expect(PricingSchema.safeParse(placeholder).success).toBe(true);
  });
});
