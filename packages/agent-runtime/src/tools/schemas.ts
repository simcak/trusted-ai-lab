import { z } from 'zod';
import { FUND_CATEGORIES } from '../funds.ts';

export const TOOL_NAMES = ['search_funds', 'calculate_fees', 'draft_email'] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export const isToolName = (name: string): name is ToolName =>
  (TOOL_NAMES as readonly string[]).includes(name);

export const SearchFundsInput = z.strictObject({
  query: z
    .string()
    .max(200)
    .describe(
      'Hledaný text: název, kategorie nebo slovo z popisu. Prázdný text vrátí všechny fondy.',
    ),
  filters: z
    .strictObject({
      category: z.enum(FUND_CATEGORIES).optional().describe('Kategorie fondu.'),
      maxSri: z
        .number()
        .int()
        .min(1)
        .max(7)
        .optional()
        .describe('Nejvyšší přípustný ukazatel rizika SRI (1–7).'),
      maxAnnualFeePct: z
        .number()
        .min(0)
        .max(10)
        .optional()
        .describe('Nejvyšší přípustný roční poplatek v %.'),
    })
    .optional(),
});
export type SearchFundsInput = z.infer<typeof SearchFundsInput>;

export const CalculateFeesInput = z.strictObject({
  fundId: z.string().min(1).max(40).describe('Id fondu z výsledku search_funds, např. "alfa".'),
  amount: z.number().positive().max(100_000_000).describe('Investovaná částka v Kč.'),
  years: z.number().int().min(1).max(40).describe('Doba investice v letech.'),
});
export type CalculateFeesInput = z.infer<typeof CalculateFeesInput>;

export const EMAIL_ROLES = ['klient', 'kolega', 'compliance'] as const;

export const DraftEmailInput = z.strictObject({
  toRole: z.enum(EMAIL_ROLES).describe('Komu je e-mail určen (role, ne adresa).'),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
});
export type DraftEmailInput = z.infer<typeof DraftEmailInput>;

export const TOOL_INPUTS = {
  search_funds: SearchFundsInput,
  calculate_fees: CalculateFeesInput,
  draft_email: DraftEmailInput,
} as const satisfies Record<ToolName, z.ZodType>;

/** Tool descriptions the model sees (Czech, like the system prompt). */
export const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  search_funds:
    'Vyhledá fondy v databázi fiktivní společnosti. Vrací název, kategorii, riziko SRI, poplatky a popis.',
  calculate_fees:
    'Spočítá poplatky za investici do fondu: vstupní poplatek a roční poplatky za celou dobu. Počítá s nulovým zhodnocením.',
  draft_email:
    'Připraví koncept e-mailu ke kontrole člověkem. Nic neodesílá: koncept se jen zobrazí v aplikaci.',
};
