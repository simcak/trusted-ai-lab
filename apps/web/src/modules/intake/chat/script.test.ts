import { FACT_FIELDS, PRESETS } from '@trusted-ai-lab/intake-rules';
import { describe, expect, it } from 'vitest';
import { answeredCount, isComplete, nextQuestion, QUESTION_ORDER } from './script.ts';

describe('chat script', () => {
  it('asks about every rule input exactly once', () => {
    expect([...QUESTION_ORDER].sort()).toEqual([...FACT_FIELDS].sort());
  });

  it('walks the questions in order and ends when everything is answered', () => {
    expect(nextQuestion({})).toBe('task');
    expect(nextQuestion({ task: 'calculation' })).toBe('deterministic');
    // An answer out of order (a reopened question) does not skip the earlier ones.
    expect(nextQuestion({ latency: 'batch' })).toBe('task');
    expect(answeredCount({ task: 'calculation', latency: 'batch' })).toBe(2);
    expect(isComplete({ task: 'calculation' })).toBe(false);
  });

  it('treats a preset as a complete set of answers', () => {
    for (const facts of Object.values(PRESETS)) {
      expect(isComplete(facts)).toBe(true);
      expect(answeredCount(facts)).toBe(QUESTION_ORDER.length);
    }
  });

  it('counts false as an answer', () => {
    expect(nextQuestion({ task: 'scoring', deterministic: false })).toBe('labeledData');
  });
});
