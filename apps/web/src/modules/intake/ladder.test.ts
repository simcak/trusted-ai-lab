import { evaluate, PRESETS, type PresetId } from '@trusted-ai-lab/intake-rules';
import { describe, expect, it } from 'vitest';
import { ladderOf, nobodyFits } from './ladder.ts';

const states = (id: PresetId) =>
  Object.fromEntries(ladderOf(evaluate(PRESETS[id])).map((r) => [r.pattern, r.state]));

describe('pattern ladder', () => {
  it('fee calculation: no AI wins; software would fit but is needless, the rest is excluded', () => {
    expect(states('fee-calculation')).toEqual({
      'no-ai': 'winner',
      'classic-software': 'needless',
      'classic-ml': 'excluded',
      llm: 'excluded',
      rag: 'excluded',
      agent: 'excluded',
    });
  });

  it('every preset has exactly one winner or is fully blocked, and the winner is the first fit', () => {
    for (const id of Object.keys(PRESETS) as PresetId[]) {
      const result = evaluate(PRESETS[id]);
      const rungs = ladderOf(result);
      if (result.blocked) {
        expect(
          rungs.every((r) => r.state === 'blocked' && r.ruleIds.length > 0),
          id,
        ).toBe(true);
        continue;
      }
      const winners = rungs.filter((r) => r.state === 'winner');
      expect(winners.length, id).toBe(nobodyFits(result) ? 0 : 1);
      const winnerAt = rungs.findIndex((r) => r.state === 'winner');
      rungs.forEach((r, i) => {
        if (i < winnerAt || winnerAt < 0) expect(r.state, `${id} ${r.pattern}`).toBe('excluded');
        if (r.state === 'excluded')
          expect(r.ruleIds.length, `${id} ${r.pattern}`).toBeGreaterThan(0);
      });
    }
  });

  it('a prohibited practice blocks every rung with the prohibition rule', () => {
    const rungs = ladderOf(evaluate(PRESETS['emotion-analysis']));
    expect(rungs.map((r) => r.ruleIds)).toEqual(rungs.map(() => ['pattern.prohibited-practice']));
  });

  it('credit decision: classic ML wins over excluded simpler rungs', () => {
    const s = states('credit-decision');
    expect(s['classic-ml']).toBe('winner');
    expect(s['no-ai']).toBe('excluded');
  });
});
