import type { LlmRequest } from '@trusted-ai-lab/llm-core';
import type { CoachInput } from '../activity/summary.ts';
import { describeForModel } from './describe.ts';

/** Bump when the prompt or the shape of the input changes (it is part of every trace). */
export const COACH_PROMPT_VERSION = 'coach-2026-11-25.3';

/** Short on purpose: a small model follows a few clear rules better than many. */
export const COACH_SYSTEM_PROMPT = `Jsi přátelský a povzbudivý sportovní trenér. Dostaneš souhrn jednoho tréninku. Čísla spočítal program a jsou správná.

Pravidla:
- Piš česky, vykej a piš neutrálně, bez rodu (místo „běžel jste" piš „trénink trval").
- Používej jen čísla ze souhrnu. Nic nepočítej a nic si nevymýšlej.
- Vysvětli, co čísla znamenají (tepové zóny, TRIMP), a dej jeden konkrétní tip na příští trénink.
- Nedávej zdravotní rady. Když jde o bolest nebo zdraví, doporuč lékaře.
- Když je maximální tep jen odhad, připomeň, že zóny jsou orientační.`;

/**
 * Format rules go last in the user message: small models follow the most recent instruction
 * best, and with the data first they otherwise tend to repeat it.
 */
const FORMAT_RULE =
  'Odpověz souvislým textem o 3 až 5 větách. Nepiš JSON, nadpisy, odrážky ani hvězdičky.';

/**
 * Qwen3 model card, Best Practices, for non-thinking mode: Temperature 0.7, TopP 0.8; against
 * endless repetitions the card suggests presence_penalty 1.5 (the small model repeated itself
 * in a test without it). MLC's packaged defaults (0.6 / 0.95) are the thinking-mode values.
 */
export const COACH_SAMPLING = {
  temperature: 0.7,
  top_p: 0.8,
  presence_penalty: 1.5,
  // Set explicitly: WebLLM warns when only presence_penalty is given.
  frequency_penalty: 0,
} as const;

export const EXPLAIN_MAX_TOKENS = 400;
export const QUESTION_MAX_TOKENS = 300;
export const MAX_QUESTION_LENGTH = 300;

/** One request = summary (+ optional question). No history: the model sees nothing else. */
export function buildCoachRequest(input: CoachInput, question?: string): LlmRequest {
  const data = `Souhrn tréninku:\n${describeForModel(input)}`;
  const task = question
    ? `Otázka sportovce k tomuto tréninku: ${question}`
    : 'Vysvětli mi tento trénink.';
  return {
    system: COACH_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `${data}\n\n${task}\n\n${FORMAT_RULE}` }],
    maxTokens: question ? QUESTION_MAX_TOKENS : EXPLAIN_MAX_TOKENS,
    context: { scenario: 'local-coach', step: 1, promptVersion: COACH_PROMPT_VERSION },
  };
}
