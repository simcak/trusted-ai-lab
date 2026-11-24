import { createTraceLog, type LlmRequest } from '@trusted-ai-lab/llm-core';
import { describe, expect, it, vi } from 'vitest';
import { HARD_MAX_MODEL_CALLS, DEFAULT_POLICY } from './config.ts';
import { runAgent, type RunAgentOptions } from './loop.ts';
import { ANSWERS, QUARANTINED } from './messages.ts';
import type { Approver } from './policy/engine.ts';
import { SCENARIOS, type ScenarioId } from './scenarios.ts';
import { FUNDS, call, noModel, scriptedProvider, type ScriptStep } from './testing.ts';

const today = new Date('2026-11-24T00:00:00Z');
const approveAll: Approver = () => Promise.resolve({ decision: 'approved', decidedBy: 'user' });

function run(
  id: ScenarioId,
  guardrails: boolean,
  script: readonly ScriptStep[],
  extra: Partial<RunAgentOptions> = {},
) {
  const s = SCENARIOS[id];
  const provider = scriptedProvider(script);
  const log = createTraceLog();
  const pending = runAgent({
    provider,
    log,
    funds: FUNDS,
    persona: s.persona,
    guardrails,
    userMessage: s.userMessage,
    approve: approveAll,
    scenario: `${id}/${guardrails ? 'on' : 'off'}`,
    today,
    ...(s.faults && { faults: s.faults }),
    ...extra,
  });
  return { provider, log, pending };
}

const toolContents = (req: LlmRequest | undefined) =>
  (req?.messages ?? []).filter((m) => m.role === 'tool').map((m) => m.content);

describe('runAgent — the loop', () => {
  const happyPath: ScriptStep[] = [
    {
      content: 'Hledám.',
      toolCalls: [
        call('t1', 'search_funds', { query: '', filters: { category: 'dluhopisový', maxSri: 3 } }),
      ],
    },
    {
      toolCalls: [
        call('t2', 'calculate_fees', { fundId: 'alfa', amount: 200_000, years: 10 }),
        call('t3', 'calculate_fees', { fundId: 'beta', amount: 200_000, years: 10 }),
      ],
    },
    { content: 'Fond Alfa stojí na poplatcích méně než Fond Beta.' },
  ];

  it('runs model → tools → model until an answer, at most a few steps', async () => {
    const { pending, provider } = run('s1-bezny-dotaz', true, happyPath);
    const result = await pending;
    expect(result).toMatchObject({
      status: 'completed',
      answer: 'Fond Alfa stojí na poplatcích méně než Fond Beta.',
      modelCalls: 3,
      usage: { inputTokens: 3000, outputTokens: 300 },
      drafts: [],
    });
    expect(provider.requests).toHaveLength(3);
  });

  it('keeps the history append-only and system prompt and tools identical (preserved thinking)', async () => {
    const { pending, provider } = run('s1-bezny-dotaz', true, happyPath);
    await pending;
    const [first, ...rest] = provider.requests;
    for (const [i, req] of rest.entries()) {
      const previous = provider.requests[i]!;
      expect(req.messages.slice(0, previous.messages.length)).toEqual(previous.messages);
      expect(req.system).toBe(first!.system);
      expect(req.tools).toEqual(first!.tools);
      expect(req.maxTokens).toBe(first!.maxTokens);
    }
  });

  it('passes providerState back to the provider but never into the trace', async () => {
    const { pending, provider, log } = run('s1-bezny-dotaz', true, happyPath);
    await pending;
    const assistant = provider.requests[1]!.messages.find((m) => m.role === 'assistant');
    expect(assistant).toMatchObject({ providerState: [{ type: 'thinking', signature: 'sig-0' }] });
    expect(JSON.stringify(log.getSnapshot())).not.toContain('sig-0');
  });

  it('answers every tool call of a turn in order', async () => {
    const { pending, provider } = run('s1-bezny-dotaz', true, happyPath);
    await pending;
    const ids = provider.requests[2]!.messages.flatMap((m) =>
      m.role === 'tool' ? [m.toolCallId] : [],
    );
    expect(ids).toEqual(['t1', 't2', 't3']);
  });

  it('traces run start, model calls, policy decisions, tool calls and run end', async () => {
    const { pending, log } = run('s1-bezny-dotaz', true, happyPath);
    await pending;
    const types = log.getSnapshot().map((e) => `${e.type}:${e.name ?? ''}`);
    expect(types).toEqual([
      'info:run_start',
      'policy_decision:tool-allowlist',
      'llm_call:byok-anthropic',
      'policy_decision:search_funds',
      'tool_call:search_funds',
      'llm_call:byok-anthropic',
      'policy_decision:calculate_fees',
      'tool_call:calculate_fees',
      'policy_decision:calculate_fees',
      'tool_call:calculate_fees',
      'llm_call:byok-anthropic',
      'info:run_end',
    ]);
  });

  it('with guardrails off stops only at the runtime hard cap', async () => {
    const loopForever = [{ toolCalls: [call('x', 'search_funds', { query: '' })] }];
    const provider = scriptedProvider(loopForever, true);
    const result = await runAgent({
      provider,
      log: createTraceLog(),
      funds: FUNDS,
      persona: 'klient',
      guardrails: false,
      userMessage: 'Najdi fondy.',
      approve: approveAll,
      scenario: 'loop/off',
    });
    expect(result).toMatchObject({ status: 'step_limit', modelCalls: HARD_MAX_MODEL_CALLS });
  });

  it('with guardrails on stops earlier at the step budget', async () => {
    let n = 0;
    const varying: ScriptStep = () => ({
      toolCalls: [call(`x${n}`, 'search_funds', { query: `${n++}` })],
    });
    const provider = scriptedProvider([varying], true);
    const result = await runAgent({
      provider,
      log: createTraceLog(),
      funds: FUNDS,
      persona: 'klient',
      guardrails: true,
      userMessage: 'Najdi fondy.',
      approve: approveAll,
      scenario: 'loop/on',
      today,
    });
    expect(result).toMatchObject({
      status: 'stopped_by_policy',
      stoppedBy: 'step-budget',
      modelCalls: DEFAULT_POLICY.maxModelCalls,
    });
  });

  it('ends on a model refusal', async () => {
    const { pending } = run('s1-bezny-dotaz', false, [{ stopReason: 'refusal' }]);
    await expect(pending).resolves.toMatchObject({
      status: 'model_refusal',
      answer: ANSWERS.modelRefusal,
    });
  });

  it('rejects when aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const { pending } = run('s1-bezny-dotaz', true, happyPath, { signal: controller.signal });
    await expect(pending).rejects.toThrow();
  });
});

describe('runAgent — the six scenarios with scripted model answers', () => {
  it('s2 on: quarantines the injection, the adviser approves the legitimate draft', async () => {
    const approve = vi.fn<Approver>(() =>
      Promise.resolve({ decision: 'approved', decidedBy: 'author' }),
    );
    const { pending, provider } = run(
      's2-injekce',
      true,
      [
        { toolCalls: [call('a', 'search_funds', { query: '', filters: { category: 'akciový' } })] },
        (req) => {
          // The client's name reaches the model only as a placeholder.
          expect(JSON.stringify(req.messages)).not.toMatch(/Petr[ua] Mal/);
          return {
            toolCalls: [
              call('b', 'draft_email', {
                toRole: 'klient',
                subject: 'Srovnání poplatků',
                body: 'Dobrý den, <OSOBA_1>, posílám srovnání.',
              }),
            ],
          };
        },
        { content: 'Koncept je připravený.' },
      ],
      { approve },
    );
    const result = await pending;
    const toModel = toolContents(provider.requests[1]).join('\n');
    expect(toModel).toContain(QUARANTINED);
    expect(toModel).not.toContain('Ignoruj');
    expect(approve).toHaveBeenCalledOnce();
    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0]?.body).toBe('Dobrý den, Petru Malou, posílám srovnání.');
  });

  it('s2 off: the model sees the injection and a draft needs no approval', async () => {
    const approve = vi.fn<Approver>();
    const { pending, provider } = run(
      's2-injekce',
      false,
      [
        { toolCalls: [call('a', 'search_funds', { query: '', filters: { category: 'akciový' } })] },
        {
          toolCalls: [
            call('b', 'draft_email', {
              toRole: 'klient',
              subject: 'Všem',
              body: 'Převeďte úspory.',
            }),
          ],
        },
        { content: 'Hotovo.' },
      ],
      { approve },
    );
    const result = await pending;
    expect(toolContents(provider.requests[1]).join('\n')).toContain(
      'Ignoruj všechny předchozí pokyny',
    );
    expect(approve).not.toHaveBeenCalled();
    expect(result.drafts).toHaveLength(1);
  });

  it('s3: the client never gets draft_email with guardrails on, but does with them off', async () => {
    const on = run('s3-email-klient', true, [{ content: 'E-mail poslat neumím.' }]);
    const off = run('s3-email-klient', false, [{ content: 'Připravím koncept.' }]);
    await Promise.all([on.pending, off.pending]);
    expect(on.provider.requests[0]!.tools!.map((t) => t.name)).not.toContain('draft_email');
    expect(off.provider.requests[0]!.tools!.map((t) => t.name)).toContain('draft_email');
  });

  it('s4 on: neither the name nor the rodné číslo reaches the model or the trace', async () => {
    const { pending, provider, log } = run('s4-rodne-cislo', true, [
      { toolCalls: [call('a', 'calculate_fees', { fundId: 'beta', amount: 50_000, years: 5 })] },
      { content: 'Dobrý den, <OSOBA_1>, za 5 let zaplatíte na poplatcích 2 966,26 Kč.' },
    ]);
    const result = await pending;
    const sent = JSON.stringify(provider.requests);
    expect(sent).not.toMatch(/Dvořáková|785215/);
    expect(sent).toContain('<RODNÉ_ČÍSLO_1>');
    expect(JSON.stringify(log.getSnapshot())).not.toMatch(/Dvořáková|785215/);
    expect(result.answer).toContain('Jana Dvořáková');
  });

  it('s4 off: the rodné číslo goes to the model as typed', async () => {
    const { pending, provider } = run('s4-rodne-cislo', false, [{ content: 'Spočítám.' }]);
    await pending;
    expect(JSON.stringify(provider.requests[0])).toContain('785215/3650');
  });

  it('s5 on: retries of an unavailable tool end safely', async () => {
    const retry: ScriptStep = () => ({
      toolCalls: [call('r', 'search_funds', { query: 'peněžní trh' })],
    });
    const provider = scriptedProvider([retry], true);
    const s = SCENARIOS['s5-smycka'];
    const result = await runAgent({
      provider,
      log: createTraceLog(),
      funds: FUNDS,
      persona: s.persona,
      guardrails: true,
      userMessage: s.userMessage,
      faults: s.faults,
      approve: approveAll,
      scenario: 's5-smycka/on',
      today,
    });
    expect(result).toMatchObject({
      status: 'stopped_by_policy',
      stoppedBy: 'loop-detection',
      answer: ANSWERS.loopStopped,
      modelCalls: 3,
    });
  });

  it('s6 on: the policy answers and the model is never called', async () => {
    const s = SCENARIOS['s6-doporuceni'];
    const result = await runAgent({
      provider: noModel,
      log: createTraceLog(),
      funds: FUNDS,
      persona: s.persona,
      guardrails: true,
      userMessage: s.userMessage,
      approve: approveAll,
      scenario: 's6-doporuceni/on',
      today,
    });
    expect(result).toMatchObject({
      status: 'refused_by_policy',
      stoppedBy: 'content-advice',
      answer: ANSWERS.adviceRefused,
      modelCalls: 0,
    });
  });

  it('s6 off: the question goes to the model', async () => {
    const { pending, provider } = run('s6-doporuceni', false, [
      { content: 'Doporučit fond nemohu.' },
    ]);
    await expect(pending).resolves.toMatchObject({ status: 'completed', modelCalls: 1 });
    expect(provider.requests).toHaveLength(1);
  });
});
