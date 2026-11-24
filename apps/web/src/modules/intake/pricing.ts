import { PricingSchema, type Pricing } from '@trusted-ai-lab/intake-rules';
import raw from '../../../../../data/pricing.json' with { type: 'json' };

/**
 * List prices with source and retrieval date — the only source of prices on this page.
 * Validated at load time: a malformed file fails loudly instead of showing wrong numbers.
 */
export const PRICING: Pricing = PricingSchema.parse(raw);
