/**
 * Token cost estimate as a range: requests per month × tokens per request × list price.
 *
 * Prices come only from `data/pricing.json` (validated by `PricingSchema`), each provider with
 * its source URL and retrieval date. Token profiles are ASSUMPTIONS of this demo, not
 * measurements (docs/OPEN_QUESTIONS.md OQ-19); they are shown next to every estimate.
 */
import { z } from 'zod';
import type { Latency, Volume } from './input.ts';
import type { PatternId } from './patterns.ts';

export const MODEL_TIERS = ['small', 'medium', 'large'] as const;
export type ModelTier = (typeof MODEL_TIERS)[number];

const ModelPriceSchema = z.object({
  model: z.string().min(1),
  tier: z.enum(MODEL_TIERS),
  /** USD per 1M input tokens; null = not verified yet (placeholder). */
  inputUsd: z.number().nonnegative().nullable(),
  outputUsd: z.number().nonnegative().nullable(),
  /** The price applies only to prompts up to this many tokens (long-context surcharge above). */
  promptTokensUpTo: z.number().int().positive().optional(),
  note: z.string().optional(),
});

const ProviderSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    source: z.url().nullable(),
    retrievedAt: z.iso.date().nullable(),
    /** Multiplier for batch processing (0.5 = half price); null when not verified. */
    batchMultiplier: z.number().gt(0).lte(1).nullable(),
    note: z.string().optional(),
    models: z.array(ModelPriceSchema).min(1),
  })
  .refine(
    (p) =>
      (p.source !== null && p.retrievedAt !== null) ||
      p.models.every((m) => m.inputUsd === null && m.outputUsd === null),
    { message: 'A provider with prices needs `source` and `retrievedAt`.' },
  );

export const PricingSchema = z.object({
  schemaVersion: z.literal(1),
  currency: z.literal('USD'),
  unit: z.literal('per_1m_tokens'),
  note: z.string(),
  providers: z.array(ProviderSchema).min(1),
});
export type Pricing = z.infer<typeof PricingSchema>;

export interface Range {
  min: number;
  max: number;
}

/** Requests per month for each volume option. The boundaries are the option labels. */
export const VOLUME_RANGES: Readonly<Record<Volume, Range>> = {
  hundreds: { min: 100, max: 1_000 },
  thousands: { min: 1_000, max: 10_000 },
  'tens-of-thousands': { min: 10_000, max: 100_000 },
  'hundreds-of-thousands': { min: 100_000, max: 1_000_000 },
};

export interface TokenProfile {
  input: Range;
  output: Range;
}

/**
 * ASSUMED tokens per request (not measured). RAG: question + retrieved passages.
 * Agent: 2–6 model calls (module 3 allows at most 6 steps), each with the growing context.
 */
export const TOKEN_PROFILES = {
  llm: { input: { min: 1_000, max: 4_000 }, output: { min: 200, max: 1_000 } },
  rag: { input: { min: 2_000, max: 8_000 }, output: { min: 200, max: 800 } },
  agent: { input: { min: 3_000, max: 24_000 }, output: { min: 300, max: 2_400 } },
} as const satisfies Record<string, TokenProfile>;
export type TokenPattern = keyof typeof TOKEN_PROFILES;

export interface TierEstimate {
  tier: ModelTier;
  /** USD per month; null when no verified price exists for this tier. */
  monthlyUsd: Range | null;
  models: { provider: string; model: string }[];
}

export type CostEstimate =
  /** The recommended pattern does not call a language model. */
  | { kind: 'no-tokens' }
  /** Classic ML: cost is hosting and training, not tokens. */
  | { kind: 'not-token-based' }
  | {
      kind: 'estimate';
      pattern: TokenPattern;
      profile: TokenProfile;
      requestsPerMonth: Range;
      batch: boolean;
      tiers: TierEstimate[];
    };

export function tokenPatternOf(pattern: PatternId): TokenPattern | null {
  return pattern === 'llm' || pattern === 'rag' || pattern === 'agent' ? pattern : null;
}

export function estimateCost(
  pattern: PatternId,
  volume: Volume,
  latency: Latency,
  pricing: Pricing,
): CostEstimate {
  if (pattern === 'classic-ml') return { kind: 'not-token-based' };
  const tokenPattern = tokenPatternOf(pattern);
  if (!tokenPattern) return { kind: 'no-tokens' };

  const profile = TOKEN_PROFILES[tokenPattern];
  const requests = VOLUME_RANGES[volume];
  const batch = latency === 'batch';

  const tiers = MODEL_TIERS.map((tier): TierEstimate => {
    const costs: Range[] = [];
    const models: TierEstimate['models'] = [];
    for (const provider of pricing.providers) {
      for (const m of provider.models) {
        const { inputUsd, outputUsd } = m;
        if (m.tier !== tier || inputUsd === null || outputUsd === null) continue;
        if (m.promptTokensUpTo !== undefined && profile.input.max > m.promptTokensUpTo) continue;
        const multiplier = batch ? (provider.batchMultiplier ?? 1) : 1;
        const perRequest = (input: number, output: number) =>
          ((input * inputUsd + output * outputUsd) / 1_000_000) * multiplier;
        costs.push({
          min: requests.min * perRequest(profile.input.min, profile.output.min),
          max: requests.max * perRequest(profile.input.max, profile.output.max),
        });
        models.push({ provider: provider.name, model: m.model });
      }
    }
    return {
      tier,
      monthlyUsd:
        costs.length === 0
          ? null
          : {
              min: Math.min(...costs.map((c) => c.min)),
              max: Math.max(...costs.map((c) => c.max)),
            },
      models,
    };
  });

  return {
    kind: 'estimate',
    pattern: tokenPattern,
    profile,
    requestsPerMonth: requests,
    batch,
    tiers,
  };
}
