import type { ToolDefinition } from '@trusted-ai-lab/llm-core';
import { z } from 'zod';
import type { Fund } from '../funds.ts';
import { calculateFees } from './calculate-fees.ts';
import {
  TOOL_DESCRIPTIONS,
  TOOL_INPUTS,
  TOOL_NAMES,
  isToolName,
  type DraftEmailInput,
  type ToolName,
} from './schemas.ts';
import { searchFunds } from './search-funds.ts';

export * from './schemas.ts';
export { calculateFees, FEE_ASSUMPTION, type FeeBreakdown } from './calculate-fees.ts';
export {
  normalize,
  searchFunds,
  type FundSummary,
  type SearchFundsResult,
} from './search-funds.ts';

/** A draft is only ever shown in the app. Nothing in this codebase can send e-mail. */
export interface EmailDraft extends DraftEmailInput {
  id: string;
  status: 'neodesláno';
}

/** Simulated outages for the „retry storm“ scenario. */
export type ToolFaults = Partial<Record<ToolName, 'unavailable'>>;

export const UNAVAILABLE_MESSAGE =
  'Služba je dočasně nedostupná (HTTP 503). Zkuste to prosím znovu.';

export type ToolResult =
  | {
      ok: true;
      /** What goes back to the model. */
      forModel: unknown;
      /** Present for draft_email: the full draft for the UI (never echoed to the model). */
      draft?: EmailDraft;
    }
  | { ok: false; error: string };

export interface Toolbox {
  /** All tools with JSON Schema generated from the zod schemas; the policy decides which are offered. */
  readonly definitions: readonly ToolDefinition[];
  execute(name: string, args: unknown): ToolResult;
}

/** JSON Schema for the model: input side, `$schema` dropped (not part of a tool definition). */
export function toInputSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _omitted, ...rest } = z.toJSONSchema(schema, { io: 'input' }) as Record<
    string,
    unknown
  >;
  return rest;
}

export function createToolbox(funds: readonly Fund[], faults: ToolFaults = {}): Toolbox {
  let drafts = 0;
  const definitions = TOOL_NAMES.map((name) => ({
    name,
    description: TOOL_DESCRIPTIONS[name],
    inputSchema: toInputSchema(TOOL_INPUTS[name]),
  }));

  return {
    definitions,
    execute(name, args) {
      if (!isToolName(name)) return { ok: false, error: `Neznámý nástroj „${name}“.` };
      if (faults[name] === 'unavailable') return { ok: false, error: UNAVAILABLE_MESSAGE };
      // The tool's own contract: it never runs on malformed input, guardrails or not.
      const parsed = TOOL_INPUTS[name].safeParse(args);
      if (!parsed.success) {
        return { ok: false, error: `Neplatné argumenty: ${z.prettifyError(parsed.error)}` };
      }
      switch (name) {
        case 'search_funds':
          return { ok: true, forModel: searchFunds(funds, TOOL_INPUTS.search_funds.parse(args)) };
        case 'calculate_fees': {
          const input = TOOL_INPUTS.calculate_fees.parse(args);
          const fund = funds.find((f) => f.id === input.fundId);
          if (!fund) {
            return {
              ok: false,
              error: `Fond „${input.fundId}“ neexistuje. Platná id: ${funds.map((f) => f.id).join(', ')}.`,
            };
          }
          return { ok: true, forModel: calculateFees(fund, input) };
        }
        case 'draft_email': {
          drafts += 1;
          const draft: EmailDraft = {
            id: `koncept-${drafts}`,
            ...TOOL_INPUTS.draft_email.parse(args),
            status: 'neodesláno',
          };
          return {
            ok: true,
            draft,
            forModel: {
              draftId: draft.id,
              status: 'Koncept je připravený ke kontrole člověkem. Nic nebylo odesláno.',
            },
          };
        }
      }
    },
  };
}
