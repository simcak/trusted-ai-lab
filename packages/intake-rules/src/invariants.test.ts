import { describe, expect, it } from 'vitest';
import { evaluate } from './engine.ts';
import { FACT_FIELDS, FIELD_OPTIONS, type IntakeFacts } from './input.ts';
import { GENAI_PATTERNS, NON_AI_PATTERNS, TECHNICAL_PATTERNS, type PatternId } from './patterns.ts';
import { getRule } from './rules.ts';

/** Every combination of form values. Volume only affects cost, so it is held fixed. */
function* allFacts(): Generator<IntakeFacts> {
  const fields = FACT_FIELDS.filter((f) => f !== 'volume');
  const current: Partial<Record<keyof IntakeFacts, unknown>> = { volume: 'thousands' };
  function* walk(i: number): Generator<IntakeFacts> {
    const field = fields[i];
    if (field === undefined) {
      yield { ...current } as IntakeFacts;
      return;
    }
    for (const value of FIELD_OPTIONS[field]) {
      current[field] = value;
      yield* walk(i + 1);
    }
  }
  yield* walk(0);
}

const isIn = (list: readonly PatternId[], p: PatternId) => list.includes(p);

describe('invariants over every combination of inputs', () => {
  it('hold for all of them', () => {
    let count = 0;
    const failures: string[] = [];
    const check = (ok: boolean, what: string, facts: IntakeFacts) => {
      if (!ok && failures.length < 10) failures.push(`${what}: ${JSON.stringify(facts)}`);
    };

    for (const facts of allFacts()) {
      count++;
      const r = evaluate(facts);
      const categories = r.aiAct.findings.map((f) => f.category);

      check(r.blocked === (facts.practice !== 'none'), 'blocked iff prohibited practice', facts);
      check(r.blocked === (r.aiAct.category === 'prohibited'), 'prohibited iff blocked', facts);
      check(!r.blocked || r.pattern === 'no-ai', 'blocked ⇒ no-ai', facts);
      check(r.aiAct.category !== 'high-risk' || r.humanInTheLoop, 'high-risk ⇒ HITL', facts);
      check(
        !categories.includes('minimal') || categories.length === 1,
        'minimal is exclusive',
        facts,
      );
      check(
        !categories.includes('out-of-scope') || categories.length === 1,
        'out-of-scope is exclusive',
        facts,
      );
      check(
        (r.aiAct.category === 'out-of-scope') === (!r.blocked && isIn(NON_AI_PATTERNS, r.pattern)),
        'out-of-scope iff the solution is not an AI system',
        facts,
      );

      // Every technical pattern other than the winner is rejected, with a reason.
      const technicalWinner = (TECHNICAL_PATTERNS as readonly PatternId[]).includes(r.pattern);
      check(
        r.rejected.length === TECHNICAL_PATTERNS.length - (technicalWinner ? 1 : 0) &&
          r.rejected.every((x) => x.pattern !== r.pattern && x.ruleIds.length > 0),
        'every alternative is rejected with a reason',
        facts,
      );

      // The winner was not excluded by any fired rule.
      const excludedWinner = r.fired.some((id) => {
        const e = getRule(id).effect;
        return e.kind === 'exclude' && (e.patterns as readonly PatternId[]).includes(r.pattern);
      });
      check(!excludedWinner, 'the winner is not excluded', facts);
      check(
        !r.blocked || r.fired.filter((id) => id.startsWith('pattern.')).length === 1,
        'a block is the only pattern rule',
        facts,
      );

      check(
        !(
          isIn(GENAI_PATTERNS, r.pattern) && ['personal', 'special'].includes(facts.dataSensitivity)
        ) || r.controls.some((c) => c.control === 'pseudonymization'),
        'personal data to an LLM ⇒ pseudonymization',
        facts,
      );
      check(
        r.pattern !== 'agent' || r.controls.some((c) => c.control === 'action-approval'),
        'agent ⇒ approval of actions',
        facts,
      );
    }

    expect(failures).toEqual([]);
    expect(count).toBe(151_200);
  });
});
