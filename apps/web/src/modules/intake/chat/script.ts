import { FIELD_OPTIONS, type FactField, type IntakeFacts } from '@trusted-ai-lab/intake-rules';

/**
 * The order in which the chat asks about an own idea: what it should do and whether there is an
 * exact answer first (that alone often settles it), then data, people and impact, then running
 * costs. Every rule input is asked exactly once.
 */
export const QUESTION_ORDER = [
  'task',
  'deterministic',
  'labeledData',
  'dataSensitivity',
  'audience',
  'decisionAboutPeople',
  'automation',
  'explainability',
  'errorTolerance',
  'practice',
  'volume',
  'latency',
] as const satisfies readonly FactField[];

export type Answers = Partial<IntakeFacts>;

/** The first question without an answer, or `null` when the facts are complete. */
export function nextQuestion(answers: Answers): FactField | null {
  return QUESTION_ORDER.find((field) => answers[field] === undefined) ?? null;
}

export function isComplete(answers: Answers): answers is IntakeFacts {
  return nextQuestion(answers) === null;
}

/** How many questions have an answer (for the „3/12“ progress). */
export function answeredCount(answers: Answers): number {
  return QUESTION_ORDER.filter((field) => answers[field] !== undefined).length;
}

/** Allowed answers of one question, in display order. */
export function optionsOf<K extends FactField>(field: K): readonly IntakeFacts[K][] {
  return FIELD_OPTIONS[field] as unknown as readonly IntakeFacts[K][];
}
