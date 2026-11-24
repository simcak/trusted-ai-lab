/**
 * intake-rules — deterministic rules engine for the Intake module ("should this be AI at all?").
 *
 *   const result = evaluate(facts);
 *   result.pattern;          // 'classic-ml'
 *   result.humanInTheLoop;   // true
 *   result.aiAct.category;   // 'high-risk'
 *   result.fired;            // ids of every rule that applied, see RULES
 *
 * No language model, no I/O: the same input always yields the same answer.
 */
export * from './input.ts';
export {
  conditionFields,
  evalCondition,
  type Condition,
  type FieldCondition,
} from './condition.ts';
export * from './patterns.ts';
export * from './controls.ts';
export {
  AI_ACT_CATEGORIES,
  AI_ACT_MILESTONES,
  AI_ACT_STATUS,
  getMilestone,
  type AiActCategory,
  type Milestone,
  type MilestoneId,
} from './ai-act.ts';
export type { Reference } from './references.ts';
export {
  getRule,
  RULES,
  type OutcomeEffect,
  type OutcomeFacts,
  type OutcomeRule,
  type PatternEffect,
  type PatternRule,
  type Rule,
  type RuleId,
} from './rules.ts';
export {
  evaluate,
  type AiActFinding,
  type ControlRequirement,
  type IntakeResult,
  type RejectedPattern,
} from './engine.ts';
export const VERSION = '0.1.0';
