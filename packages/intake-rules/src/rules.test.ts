import { describe, expect, it } from 'vitest';
import { evaluate, type IntakeResult } from './engine.ts';
import { NEUTRAL_INPUT, type IntakeFacts, type IntakeInput } from './input.ts';
import { getRule, RULES, type RuleId } from './rules.ts';

/**
 * One case per rule: inputs (on top of NEUTRAL_INPUT) where the rule must fire, and where it
 * must not. `Record<RuleId, …>` makes a new rule without a test a type error.
 * NEUTRAL_INPUT alone evaluates to: pattern `llm`, AI Act `minimal`, control `evals`.
 */
const RULE_CASES: Record<
  RuleId,
  { matches: Partial<IntakeFacts>[]; doesNotMatch: Partial<IntakeFacts>[] }
> = {
  'pattern.prohibited-practice': {
    matches: [{ practice: 'emotion-workplace' }, { practice: 'social-scoring' }],
    doesNotMatch: [{}],
  },
  'pattern.exact-solution': {
    matches: [{ deterministic: true }],
    doesNotMatch: [{}],
  },
  'pattern.needs-system': {
    matches: [
      { deterministic: true, task: 'document-qa' },
      { deterministic: true, task: 'actions' },
    ],
    doesNotMatch: [
      { deterministic: true, task: 'calculation' },
      { deterministic: false, task: 'document-qa' },
    ],
  },
  'pattern.no-exact-solution': {
    matches: [{}],
    doesNotMatch: [{ deterministic: true }],
  },
  'pattern.ml-needs-labels': {
    matches: [{}],
    doesNotMatch: [{ labeledData: true }],
  },
  'pattern.ml-cannot-generate': {
    matches: [{ task: 'drafting' }, { task: 'document-qa' }, { task: 'actions' }],
    doesNotMatch: [{ task: 'classification' }, { task: 'scoring' }],
  },
  'pattern.single-call-scope': {
    matches: [{ task: 'document-qa' }, { task: 'actions' }],
    doesNotMatch: [{ task: 'extraction' }, { task: 'drafting' }],
  },
  'pattern.rag-only-for-documents': {
    matches: [{}, { task: 'actions' }],
    doesNotMatch: [{ task: 'document-qa' }],
  },
  'pattern.agent-only-for-actions': {
    matches: [{}, { task: 'document-qa' }],
    doesNotMatch: [{ task: 'actions' }],
  },
  'pattern.explainable-decisions': {
    matches: [{ explainability: 'high', decisionAboutPeople: 'other' }],
    doesNotMatch: [{ explainability: 'high' }, { decisionAboutPeople: 'credit' }],
  },
  'pattern.realtime-latency': {
    matches: [{ latency: 'realtime' }],
    doesNotMatch: [{}, { latency: 'batch' }],
  },
  'pattern.prefer-simplest': {
    // classic-ml and llm both fit; classic-ml is simpler.
    matches: [{ task: 'classification', labeledData: true }],
    // Only llm fits.
    doesNotMatch: [{}],
  },
  'pattern.no-candidate': {
    // Not exact, no labels, decisions about people that must be explained → nothing fits.
    matches: [{ task: 'scoring', explainability: 'high', decisionAboutPeople: 'other' }],
    doesNotMatch: [{}],
  },
  'hitl.high-risk': {
    matches: [
      { decisionAboutPeople: 'credit' },
      { decisionAboutPeople: 'insurance' },
      { decisionAboutPeople: 'employment' },
    ],
    // Not an Annex III area / no AI in the solution.
    doesNotMatch: [
      { decisionAboutPeople: 'other' },
      { decisionAboutPeople: 'credit', deterministic: true },
    ],
  },
  'hitl.low-error-tolerance': {
    matches: [{ errorTolerance: 'low' }],
    doesNotMatch: [{}, { errorTolerance: 'low', task: 'classification', labeledData: true }],
  },
  'hitl.agent-actions': {
    matches: [{ task: 'actions' }],
    doesNotMatch: [{}, { task: 'actions', deterministic: true }],
  },
  'aiact.prohibited-emotion-workplace': {
    matches: [{ practice: 'emotion-workplace' }],
    doesNotMatch: [{}, { practice: 'social-scoring' }],
  },
  'aiact.prohibited-social-scoring': {
    matches: [{ practice: 'social-scoring' }],
    doesNotMatch: [{}, { practice: 'emotion-workplace' }],
  },
  'aiact.high-risk-credit': {
    matches: [{ decisionAboutPeople: 'credit' }],
    doesNotMatch: [
      { decisionAboutPeople: 'insurance' },
      { decisionAboutPeople: 'credit', deterministic: true },
    ],
  },
  'aiact.high-risk-insurance': {
    matches: [{ decisionAboutPeople: 'insurance' }],
    doesNotMatch: [
      { decisionAboutPeople: 'credit' },
      { decisionAboutPeople: 'insurance', deterministic: true },
    ],
  },
  'aiact.high-risk-employment': {
    matches: [{ decisionAboutPeople: 'employment' }],
    doesNotMatch: [
      { decisionAboutPeople: 'other' },
      { decisionAboutPeople: 'employment', practice: 'emotion-workplace' },
    ],
  },
  'aiact.transparency-interaction': {
    matches: [{ audience: 'clients' }, { audience: 'clients', task: 'document-qa' }],
    doesNotMatch: [{}, { audience: 'clients', task: 'classification', labeledData: true }],
  },
  'aiact.minimal': {
    matches: [{}, { task: 'classification', labeledData: true, audience: 'clients' }],
    doesNotMatch: [
      { audience: 'clients' },
      { decisionAboutPeople: 'credit' },
      { deterministic: true },
    ],
  },
  'aiact.not-ai-system': {
    matches: [
      { deterministic: true },
      { task: 'scoring', explainability: 'high', decisionAboutPeople: 'other' },
    ],
    doesNotMatch: [{}, { practice: 'social-scoring' }],
  },
  'data.personal-to-llm': {
    matches: [{ dataSensitivity: 'personal' }, { dataSensitivity: 'special' }],
    doesNotMatch: [
      { dataSensitivity: 'confidential' },
      { dataSensitivity: 'personal', task: 'classification', labeledData: true },
    ],
  },
  'data.special-local': {
    matches: [
      { dataSensitivity: 'special' },
      { dataSensitivity: 'special', task: 'classification', labeledData: true },
    ],
    doesNotMatch: [
      { dataSensitivity: 'personal' },
      { dataSensitivity: 'special', deterministic: true },
    ],
  },
  'data.provider-terms': {
    matches: [{ dataSensitivity: 'confidential' }, { dataSensitivity: 'personal' }],
    doesNotMatch: [{}, { dataSensitivity: 'confidential', deterministic: true }],
  },
  'data.permission-aware-retrieval': {
    matches: [{ task: 'document-qa' }],
    doesNotMatch: [{}, { task: 'document-qa', dataSensitivity: 'public' }],
  },
  'control.prompt-injection': {
    matches: [{ task: 'document-qa' }, { task: 'actions' }],
    doesNotMatch: [{}],
  },
  'control.agent-guardrails': {
    matches: [{ task: 'actions' }],
    doesNotMatch: [{}, { task: 'document-qa' }],
  },
  'control.automated-decision': {
    matches: [
      { decisionAboutPeople: 'other', automation: 'automatic' },
      // GDPR applies without AI too.
      { decisionAboutPeople: 'credit', automation: 'automatic', deterministic: true },
    ],
    doesNotMatch: [
      { decisionAboutPeople: 'other' },
      { automation: 'automatic' },
      { decisionAboutPeople: 'employment', automation: 'automatic', practice: 'emotion-workplace' },
    ],
  },
  'control.high-risk-obligations': {
    matches: [{ decisionAboutPeople: 'employment' }, { decisionAboutPeople: 'credit' }],
    doesNotMatch: [{ decisionAboutPeople: 'other' }],
  },
  'control.fria': {
    matches: [{ decisionAboutPeople: 'credit' }, { decisionAboutPeople: 'insurance' }],
    doesNotMatch: [{ decisionAboutPeople: 'employment' }],
  },
  'control.evals': {
    matches: [{}, { task: 'document-qa' }],
    doesNotMatch: [{ task: 'classification', labeledData: true }, { deterministic: true }],
  },
};

/** The rule's effect must be visible in the result, not just listed in `fired`. */
function expectEffect(id: RuleId, result: IntakeResult): void {
  const effect = getRule(id).effect;
  switch (effect.kind) {
    case 'exclude':
      for (const p of effect.patterns) {
        expect(result.pattern).not.toBe(p);
        expect(result.rejected.find((r) => r.pattern === p)?.ruleIds).toContain(id);
      }
      return;
    case 'block':
      expect(result.blocked).toBe(true);
      expect(result.pattern).toBe('no-ai');
      return;
    case 'prefer-simplest':
      expect(result.rejected.some((r) => r.ruleIds.includes(id))).toBe(true);
      return;
    case 'fallback':
      expect(result.pattern).toBe('human-in-the-loop');
      expect(result.humanInTheLoop).toBe(true);
      return;
    case 'human-in-the-loop':
      expect(result.humanInTheLoop).toBe(true);
      return;
    case 'ai-act':
      expect(result.aiAct.findings).toContainEqual({
        category: effect.category,
        ruleId: id,
        appliesFrom: effect.appliesFrom,
      });
      return;
    case 'controls':
      for (const c of effect.controls) {
        expect(result.controls.find((r) => r.control === c)?.ruleIds).toContain(id);
      }
      return;
  }
}

describe('every rule fires exactly where it should', () => {
  for (const rule of RULES) {
    const cases = RULE_CASES[rule.id];

    it(`${rule.id} fires and its effect is visible`, () => {
      expect(cases.matches.length).toBeGreaterThan(0);
      for (const override of cases.matches) {
        const result = evaluate({ ...NEUTRAL_INPUT, ...override });
        expect(result.fired, JSON.stringify(override)).toContain(rule.id);
        expectEffect(rule.id, result);
      }
    });

    it(`${rule.id} does not fire otherwise`, () => {
      expect(cases.doesNotMatch.length).toBeGreaterThan(0);
      for (const override of cases.doesNotMatch) {
        const result = evaluate({ ...NEUTRAL_INPUT, ...override });
        expect(result.fired, JSON.stringify(override)).not.toContain(rule.id);
      }
    });
  }
});

describe('engine', () => {
  it('evaluates the neutral input as documented above', () => {
    const result = evaluate(NEUTRAL_INPUT);
    expect(result).toMatchObject({
      pattern: 'llm',
      humanInTheLoop: false,
      blocked: false,
      aiAct: { category: 'minimal' },
    });
    expect(result.controls.map((c) => c.control)).toEqual(['evals']);
  });

  it('is deterministic', () => {
    expect(evaluate(NEUTRAL_INPUT)).toEqual(evaluate(NEUTRAL_INPUT));
  });

  it('ignores the free-text description', () => {
    const withText: IntakeInput = { ...NEUTRAL_INPUT, description: 'Napiš e-mail všem klientům.' };
    expect(evaluate(withText)).toEqual(evaluate(NEUTRAL_INPUT));
  });

  it('a prohibited practice is decided before any exclusion is weighed', () => {
    const result = evaluate({ ...NEUTRAL_INPUT, practice: 'emotion-workplace' });
    expect(result.fired.filter((id) => id.startsWith('pattern.'))).toEqual([
      'pattern.prohibited-practice',
    ]);
  });

  it('lists the most severe AI Act finding first', () => {
    // Credit decisions by a client-facing LLM: high-risk and transparency at the same time.
    const result = evaluate({
      ...NEUTRAL_INPUT,
      audience: 'clients',
      decisionAboutPeople: 'credit',
    });
    expect(result.pattern).toBe('llm');
    expect(result.aiAct.category).toBe('high-risk');
    expect(result.aiAct.findings.map((f) => f.category)).toEqual(['high-risk', 'transparency']);
  });

  it('a blocked practice rejects every other pattern with the blocking rule', () => {
    const result = evaluate({ ...NEUTRAL_INPUT, practice: 'social-scoring' });
    expect(result.rejected.map((r) => r.ruleIds)).toEqual(
      Array(5).fill(['pattern.prohibited-practice']),
    );
  });
});
