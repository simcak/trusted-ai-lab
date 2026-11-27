import {
  TECHNICAL_PATTERNS,
  type IntakeResult,
  type RuleId,
  type TechnicalPattern,
} from '@trusted-ai-lab/intake-rules';

/**
 * One rung of the pattern ladder, simplest first. The engine takes the simplest pattern that no
 * rule excluded, so the ladder shows exactly that: excluded rungs, the winner, and rungs that
 * would fit but are more complex than needed.
 */
export type RungState = 'excluded' | 'winner' | 'needless' | 'blocked';

export interface Rung {
  pattern: TechnicalPattern;
  state: RungState;
  /** Why it was excluded (or blocked); empty for the winner and for needless rungs. */
  ruleIds: RuleId[];
}

export function ladderOf(result: IntakeResult): Rung[] {
  const rejected = new Map(result.rejected.map((r) => [r.pattern, r.ruleIds]));
  return TECHNICAL_PATTERNS.map((pattern) => {
    if (result.blocked) {
      return { pattern, state: 'blocked', ruleIds: blockingRules(result) };
    }
    if (pattern === result.pattern) return { pattern, state: 'winner', ruleIds: [] };
    const ruleIds = rejected.get(pattern) ?? [];
    return ruleIds.length === 1 && ruleIds[0] === 'pattern.prefer-simplest'
      ? { pattern, state: 'needless', ruleIds: [] }
      : { pattern, state: 'excluded', ruleIds };
  });
}

/** No rung fits: a person decides (`human-in-the-loop` as the whole result). */
export const nobodyFits = (result: IntakeResult) =>
  !result.blocked && result.pattern === 'human-in-the-loop';

function blockingRules(result: IntakeResult): RuleId[] {
  return result.fired.filter((id) => id === 'pattern.prohibited-practice');
}
