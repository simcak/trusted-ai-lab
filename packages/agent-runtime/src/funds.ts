import { z } from 'zod';

export const FUND_CATEGORIES = [
  'akciový',
  'dluhopisový',
  'smíšený',
  'peněžní trh',
  'nemovitostní',
] as const;
export type FundCategory = (typeof FUND_CATEGORIES)[number];

export const FundSchema = z.strictObject({
  id: z.string().regex(/^[a-z]+$/),
  name: z.string().min(1),
  category: z.enum(FUND_CATEGORIES),
  /** Summary risk indicator 1 (lowest) – 7 (highest). */
  sri: z.number().int().min(1).max(7),
  /** One-off entry fee in % of the invested amount. */
  entryFeePct: z.number().min(0).max(10),
  /** Ongoing annual fee (TER) in % of the current value. */
  annualFeePct: z.number().min(0).max(10),
  /** Free text from the fund database — untrusted content as far as the model is concerned. */
  description: z.string().min(1),
});
export type Fund = z.infer<typeof FundSchema>;

/** Shape of `data/funds.json` (fictional funds only). */
export const FundsFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  note: z.string().min(1),
  currency: z.literal('CZK'),
  funds: z
    .array(FundSchema)
    .min(1)
    .refine((funds) => new Set(funds.map((f) => f.id)).size === funds.length, {
      message: 'Fund ids must be unique',
    }),
});
export type FundsFile = z.infer<typeof FundsFileSchema>;
