import { describe, expect, it } from 'vitest';
import raw from '../../../data/pricing.json' with { type: 'json' };
import { MODEL_TIERS, PricingSchema, TOKEN_PROFILES } from './cost.ts';

/** Checks the committed price list (data/pricing.json), which the web page reads. */
describe('data/pricing.json', () => {
  const pricing = PricingSchema.parse(raw);

  it('every provider names its source and retrieval date', () => {
    for (const p of pricing.providers) {
      expect(p.source, p.id).toMatch(/^https:\/\//);
      expect(p.retrievedAt, p.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('every model tier has at least one verified price', () => {
    for (const tier of MODEL_TIERS) {
      const priced = pricing.providers.flatMap((p) =>
        p.models.filter((m) => m.tier === tier && m.inputUsd !== null && m.outputUsd !== null),
      );
      expect(priced.length, tier).toBeGreaterThan(0);
    }
  });

  it('no model is silently dropped because of a prompt-length limit', () => {
    const longest = Math.max(...Object.values(TOKEN_PROFILES).map((p) => p.input.max));
    for (const m of pricing.providers.flatMap((p) => p.models)) {
      if (m.promptTokensUpTo !== undefined)
        expect(m.promptTokensUpTo, m.model).toBeGreaterThan(longest);
    }
  });
});
