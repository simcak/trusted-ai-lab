import { AI_ACT_CATEGORIES, type AiActCategory, type MilestoneId } from './ai-act.ts';
import { evalCondition } from './condition.ts';
import { CONTROLS, type ControlId } from './controls.ts';
import type { IntakeFacts } from './input.ts';
import { TECHNICAL_PATTERNS, type PatternId, type TechnicalPattern } from './patterns.ts';
import { RULES, type OutcomeFacts, type RuleId } from './rules.ts';

export interface RejectedPattern {
  pattern: TechnicalPattern;
  /** Rules that excluded it; `pattern.prefer-simplest` when it fitted but a simpler one won. */
  ruleIds: RuleId[];
}

export interface AiActFinding {
  category: AiActCategory;
  ruleId: RuleId;
  appliesFrom: MilestoneId;
}

export interface ControlRequirement {
  control: ControlId;
  ruleIds: RuleId[];
}

export interface IntakeResult {
  pattern: PatternId;
  /** A person approves or decides (overlay on `pattern`, or the result itself). */
  humanInTheLoop: boolean;
  /** A prohibited practice: nothing should be built. */
  blocked: boolean;
  rejected: RejectedPattern[];
  aiAct: { category: AiActCategory; findings: AiActFinding[] };
  controls: ControlRequirement[];
  /** Every rule whose condition held, in rule order. */
  fired: RuleId[];
}

/** Deterministic: the same facts always give the same result. No I/O, no clock, no model. */
export function evaluate(facts: IntakeFacts): IntakeResult {
  const fired: RuleId[] = [];

  // Stage 1a: a prohibited practice ends the choice of pattern; nothing else is weighed.
  let blockedBy: RuleId | undefined;
  for (const rule of RULES) {
    if (rule.stage !== 'pattern' || rule.effect.kind !== 'block') continue;
    if (!evalCondition<IntakeFacts>(rule.when, facts)) continue;
    fired.push(rule.id);
    blockedBy ??= rule.id;
  }

  // Stage 1b: exclusions.
  const excludedBy = new Map<TechnicalPattern, RuleId[]>();
  for (const rule of blockedBy ? [] : RULES) {
    if (rule.stage !== 'pattern') continue;
    const effect = rule.effect;
    if (effect.kind !== 'exclude') continue;
    if (!evalCondition<IntakeFacts>(rule.when, facts)) continue;
    fired.push(rule.id);
    for (const p of effect.patterns) excludedBy.set(p, [...(excludedBy.get(p) ?? []), rule.id]);
  }

  let pattern: PatternId;
  let rejected: RejectedPattern[];
  if (blockedBy) {
    const by = blockedBy;
    pattern = 'no-ai';
    rejected = TECHNICAL_PATTERNS.filter((p) => p !== 'no-ai').map((p) => ({
      pattern: p,
      ruleIds: [by],
    }));
  } else {
    const candidates = TECHNICAL_PATTERNS.filter((p) => !excludedBy.has(p));
    const winner = candidates[0];
    if (winner === undefined) {
      pattern = 'human-in-the-loop';
      fired.push('pattern.no-candidate');
    } else {
      pattern = winner;
      if (candidates.length > 1) fired.push('pattern.prefer-simplest');
    }
    rejected = TECHNICAL_PATTERNS.filter((p) => p !== pattern).map((p) => ({
      pattern: p,
      ruleIds: excludedBy.get(p) ?? ['pattern.prefer-simplest'],
    }));
  }

  // Stage 2: consequences of the chosen pattern.
  const outcomeFacts: OutcomeFacts = { ...facts, pattern };
  let humanInTheLoop = pattern === 'human-in-the-loop';
  const findings: AiActFinding[] = [];
  const controls = new Map<ControlId, RuleId[]>();
  for (const rule of RULES) {
    if (rule.stage !== 'outcome') continue;
    if (!evalCondition<OutcomeFacts>(rule.when, outcomeFacts)) continue;
    fired.push(rule.id);
    const effect = rule.effect;
    if (effect.kind === 'human-in-the-loop') {
      humanInTheLoop = true;
    } else if (effect.kind === 'ai-act') {
      findings.push({
        category: effect.category,
        ruleId: rule.id,
        appliesFrom: effect.appliesFrom,
      });
    } else {
      for (const c of effect.controls) controls.set(c, [...(controls.get(c) ?? []), rule.id]);
    }
  }

  const category = AI_ACT_CATEGORIES.find((c) => findings.some((f) => f.category === c));
  // Unreachable: invariants.test.ts checks every combination of inputs.
  if (!category) throw new Error('No AI Act rule matched');
  findings.sort(
    (a, b) => AI_ACT_CATEGORIES.indexOf(a.category) - AI_ACT_CATEGORIES.indexOf(b.category),
  );

  return {
    pattern,
    humanInTheLoop,
    blocked: blockedBy !== undefined,
    rejected,
    aiAct: { category, findings },
    controls: CONTROLS.filter((c) => controls.has(c)).map((c) => ({
      control: c,
      ruleIds: controls.get(c) ?? [],
    })),
    fired,
  };
}
