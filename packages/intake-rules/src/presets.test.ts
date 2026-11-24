import { describe, expect, it } from 'vitest';
import type { AiActCategory } from './ai-act.ts';
import type { ControlId } from './controls.ts';
import { estimateCost, type CostEstimate, type Pricing } from './cost.ts';
import { evaluate } from './engine.ts';
import type { PatternId } from './patterns.ts';
import { PRESET_IDS, PRESETS, type PresetId } from './presets.ts';

interface Expected {
  pattern: PatternId;
  humanInTheLoop: boolean;
  blocked: boolean;
  aiAct: AiActCategory;
  controls: ControlId[];
  cost: CostEstimate['kind'];
}

/** The story each preset is meant to tell (CLAUDE.md, module 1). */
const EXPECTED: Record<PresetId, Expected> = {
  // „AI nepotřebujete“
  'fee-calculation': {
    pattern: 'no-ai',
    humanInTheLoop: false,
    blocked: false,
    aiAct: 'out-of-scope',
    controls: [],
    cost: 'no-tokens',
  },
  // → RAG
  'policy-summary': {
    pattern: 'rag',
    humanInTheLoop: false,
    blocked: false,
    aiAct: 'minimal',
    controls: ['permission-aware-retrieval', 'prompt-injection-defense', 'evals'],
    cost: 'estimate',
  },
  // → high risk, human in the loop
  'credit-decision': {
    pattern: 'classic-ml',
    humanInTheLoop: true,
    blocked: false,
    aiAct: 'high-risk',
    controls: ['human-intervention', 'dpia', 'human-oversight', 'logging', 'fria'],
    cost: 'not-token-based',
  },
  // → transparency
  'client-chatbot': {
    pattern: 'rag',
    humanInTheLoop: false,
    blocked: false,
    aiAct: 'transparency',
    controls: [
      'pseudonymization',
      'provider-terms',
      'permission-aware-retrieval',
      'prompt-injection-defense',
      'evals',
    ],
    cost: 'estimate',
  },
  // Labelled history + volume → classic ML; health data → local processing (module 4).
  'mail-triage': {
    pattern: 'classic-ml',
    humanInTheLoop: false,
    blocked: false,
    aiAct: 'minimal',
    controls: ['local-processing'],
    cost: 'not-token-based',
  },
  // A single LLM call with structured output, checked by a person.
  'contract-extraction': {
    pattern: 'llm',
    humanInTheLoop: true,
    blocked: false,
    aiAct: 'minimal',
    controls: ['pseudonymization', 'provider-terms', 'evals'],
    cost: 'estimate',
  },
  // Prohibited practice → do not build.
  'emotion-analysis': {
    pattern: 'no-ai',
    humanInTheLoop: false,
    blocked: true,
    aiAct: 'prohibited',
    controls: [],
    cost: 'no-tokens',
  },
  // Agent with approval (module 3).
  'advisor-assistant': {
    pattern: 'agent',
    humanInTheLoop: true,
    blocked: false,
    aiAct: 'minimal',
    controls: [
      'pseudonymization',
      'provider-terms',
      'prompt-injection-defense',
      'agent-guardrails',
      'action-approval',
      'evals',
    ],
    cost: 'estimate',
  },
};

const FIXTURE_PRICING: Pricing = {
  schemaVersion: 1,
  currency: 'USD',
  unit: 'per_1m_tokens',
  note: 'test fixture',
  providers: [
    {
      id: 'p',
      name: 'Provider',
      source: 'https://example.test/pricing',
      retrievedAt: '2026-01-01',
      batchMultiplier: 0.5,
      models: [{ model: 'm', tier: 'small', inputUsd: 1, outputUsd: 2 }],
    },
  ],
};

describe('presets', () => {
  it('there are eight', () => {
    expect(PRESET_IDS).toHaveLength(8);
  });

  for (const id of PRESET_IDS) {
    it(`${id} gives the intended recommendation`, () => {
      const expected = EXPECTED[id];
      const facts = PRESETS[id];
      const result = evaluate(facts);
      expect({
        pattern: result.pattern,
        humanInTheLoop: result.humanInTheLoop,
        blocked: result.blocked,
        aiAct: result.aiAct.category,
        controls: result.controls.map((c) => c.control),
        cost: estimateCost(result.pattern, facts.volume, facts.latency, FIXTURE_PRICING).kind,
      }).toEqual(expected);
    });
  }

  it('the credit decision is high-risk under Annex III from 2 December 2027', () => {
    const { aiAct } = evaluate(PRESETS['credit-decision']);
    expect(aiAct.findings).toEqual([
      { category: 'high-risk', ruleId: 'aiact.high-risk-credit', appliesFrom: 'annex-iii' },
    ]);
  });

  it('the emotion analysis is prohibited under Art. 5(1)(f)', () => {
    const { aiAct } = evaluate(PRESETS['emotion-analysis']);
    expect(aiAct.findings.map((f) => f.ruleId)).toEqual(['aiact.prohibited-emotion-workplace']);
  });

  it('the contract extraction runs as a batch', () => {
    const facts = PRESETS['contract-extraction'];
    const cost = estimateCost('llm', facts.volume, facts.latency, FIXTURE_PRICING);
    expect(cost.kind === 'estimate' && cost.batch).toBe(true);
  });
});
