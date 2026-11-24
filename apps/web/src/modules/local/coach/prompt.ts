import type { LlmRequest } from '@trusted-ai-lab/llm-core';
import type { CoachInput } from '../activity/summary.ts';

/** Bump when the prompt or the shape of the input changes (it is part of every trace). */
export const COACH_PROMPT_VERSION = 'coach-2026-11-24.1';

/** Short on purpose: a small model follows a few clear rules better than many. */
export const COACH_SYSTEM_PROMPT = `Jsi přátelský a povzbudivý sportovní trenér. Dostaneš souhrn jednoho tréninku jako JSON. Čísla spočítal program a jsou správná.

Pravidla:
- Piš česky, vykej a piš neutrálně, bez rodu (místo „běžel jste" piš „trénink trval").
- Napiš 4 až 6 krátkých vět prostým textem. Žádné nadpisy, odrážky ani Markdown.
- Používej jen čísla z JSON. Nic nepočítej a nic si nevymýšlej.
- Vysvětli, co čísla znamenají (tepové zóny, TRIMP), a dej jeden konkrétní tip na příští trénink.
- Nedávej zdravotní rady. Když jde o bolest nebo zdraví, doporuč lékaře.
- Když je max_tep_je_odhad true, připomeň, že zóny jsou jen orientační.`;

export const EXPLAIN_MAX_TOKENS = 400;
export const QUESTION_MAX_TOKENS = 300;
export const MAX_QUESTION_LENGTH = 300;

/** One request = summary (+ optional question). No history: the model sees nothing else. */
export function buildCoachRequest(input: CoachInput, question?: string): LlmRequest {
  const summary = `Souhrn tréninku (JSON):\n${JSON.stringify(input, null, 2)}`;
  const task = question
    ? `Otázka sportovce: ${question}\nOdpověz na otázku v souvislosti s tímto tréninkem.`
    : 'Vysvětli mi tento trénink.';
  return {
    system: COACH_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `${summary}\n\n${task}` }],
    maxTokens: question ? QUESTION_MAX_TOKENS : EXPLAIN_MAX_TOKENS,
    context: { scenario: 'local-coach', step: 1, promptVersion: COACH_PROMPT_VERSION },
  };
}
