import { z } from 'zod';
import type { ToolName } from './tools/schemas.ts';

export const PERSONAS = ['klient', 'poradce'] as const;
export type Persona = (typeof PERSONAS)[number];

/** Model and request settings shared by the recording script and BYOK (chosen by the author). */
export const AGENT_MODEL = 'claude-sonnet-5-5';
/** Set explicitly: the default differs between models. `medium` suits multi-step tool use. */
export const AGENT_EFFORT = 'medium';
/** Per call; thinking counts towards it. Part of every request (and its hash). */
export const AGENT_MAX_TOKENS = 16_000;

/**
 * Safety net of the runtime itself, independent of guardrails: even with the policy layer off the
 * loop never makes more than this many model calls.
 */
export const HARD_MAX_MODEL_CALLS = 6;

/** Least privilege: which tools each persona may use (in production: identity roles, not a toggle). */
export const PERSONA_TOOLS: Readonly<Record<Persona, readonly ToolName[]>> = {
  klient: ['search_funds', 'calculate_fees'],
  poradce: ['search_funds', 'calculate_fees', 'draft_email'],
};

/** Actions with an impact outside the conversation: a human decides. */
export const APPROVAL_REQUIRED: readonly ToolName[] = ['draft_email'];

export const PolicyConfigSchema = z.strictObject({
  /** Model calls per run (stricter than HARD_MAX_MODEL_CALLS). */
  maxModelCalls: z.number().int().positive(),
  /** Input + output tokens summed over all calls of a run (input is resent on every call). */
  maxTotalTokens: z.number().int().positive(),
  /** The same tool with the same arguments may run this many times; the next one stops the run. */
  maxIdenticalCalls: z.number().int().positive(),
  /** After this many failures of one tool in a row the run stops. */
  maxConsecutiveToolErrors: z.number().int().positive(),
});
export type PolicyConfig = z.infer<typeof PolicyConfigSchema>;

/**
 * Design choices, not measurements: a normal run needs 2–4 calls and well under 40 000 tokens,
 * so the limits only stop runaway runs. Every recording stores the values it ran with.
 */
export const DEFAULT_POLICY: PolicyConfig = {
  maxModelCalls: 5,
  maxTotalTokens: 80_000,
  maxIdenticalCalls: 2,
  maxConsecutiveToolErrors: 3,
};

/** Ids of the policy rules; every policy_decision trace event names one of them. */
export const RULE_IDS = [
  'tool-allowlist',
  'tool-args',
  'step-budget',
  'token-budget',
  'loop-detection',
  'pii-pseudonymize',
  'untrusted-output',
  'prompt-injection',
  'content-advice',
  'human-approval',
] as const;
export type RuleId = (typeof RULE_IDS)[number];
