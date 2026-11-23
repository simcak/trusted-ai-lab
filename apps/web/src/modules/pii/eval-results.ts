import raw from '../../../../../evals/pii/results.json' with { type: 'json' };
import { ResultsSchema, type Results } from '../../../../../evals/pii/schema.ts';

/**
 * Eval output written by evals/pii/run.ts — the only source of numbers on this page.
 * Validated at load time: a malformed file fails loudly instead of showing wrong numbers.
 */
export const RESULTS: Results = ResultsSchema.parse(raw);
