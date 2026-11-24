/**
 * Architecture patterns, ordered from the simplest to the most complex. The engine picks the
 * simplest pattern that no rule has excluded: complexity has to earn its place.
 */
export const TECHNICAL_PATTERNS = [
  'no-ai',
  'classic-software',
  'classic-ml',
  'llm',
  'rag',
  'agent',
] as const;
export type TechnicalPattern = (typeof TECHNICAL_PATTERNS)[number];

/**
 * `human-in-the-loop` is the result only when no automated pattern fits. Otherwise it is an
 * overlay on top of a technical pattern (`IntakeResult.humanInTheLoop`).
 */
export const PATTERNS = [...TECHNICAL_PATTERNS, 'human-in-the-loop'] as const;
export type PatternId = (typeof PATTERNS)[number];

/** Patterns that make the result an AI system (AI Act Art. 3(1)). */
export const AI_PATTERNS = ['classic-ml', 'llm', 'rag', 'agent'] as const satisfies PatternId[];

/** Patterns that send text to a generative language model. */
export const GENAI_PATTERNS = ['llm', 'rag', 'agent'] as const satisfies PatternId[];

export const NON_AI_PATTERNS = [
  'no-ai',
  'classic-software',
  'human-in-the-loop',
] as const satisfies PatternId[];

export function isGenAi(pattern: PatternId): boolean {
  return (GENAI_PATTERNS as readonly PatternId[]).includes(pattern);
}
