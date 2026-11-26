import { createTraceLog, type TraceEventInput } from '@trusted-ai-lab/llm-core';
import { describe, expect, it } from 'vitest';
import { cs } from '../../../i18n/cs.ts';
import { toBeats } from './beats.ts';

const t = cs.agent.beats;

/** Hand-written trace events in the shapes the agent runtime emits — fixtures, not model output. */
function trace(...events: TraceEventInput[]) {
  const log = createTraceLog();
  for (const e of events) log.emit(e);
  return log.getSnapshot();
}

const start = (persona: 'klient' | 'poradce'): TraceEventInput => ({
  type: 'info',
  name: 'run_start',
  input: { persona, guardrails: true },
});
const model = (step: number, tools: string[], content = ''): TraceEventInput => ({
  type: 'llm_call',
  step,
  output: { content, toolCalls: tools.map((name, i) => ({ id: `c${i}`, name, arguments: {} })) },
  usage: { inputTokens: 1000, outputTokens: 200 },
});
const decide = (
  rule: string,
  decision: 'allow' | 'deny' | 'modify' | 'require_approval',
  name?: string,
  step?: number,
): TraceEventInput => ({
  type: 'policy_decision',
  name: name ?? rule,
  ...(step !== undefined && { step }),
  policy: { rule, decision, reason: 'fixture' },
});
const tool = (name: string, step: number, ok = true): TraceEventInput => ({
  type: 'tool_call',
  name,
  step,
  output: { ok, content: '' },
});
const end = (status: string, modelCalls: number): TraceEventInput => ({
  type: 'info',
  name: 'run_end',
  output: { status, modelCalls, usage: { inputTokens: 900, outputTokens: 100 } },
});

describe('toBeats', () => {
  it('a client run: the rules hide the e-mail tool and let each call through', () => {
    const beats = toBeats(
      trace(
        start('klient'),
        decide('tool-allowlist', 'modify'),
        model(0, ['search_funds']),
        decide('tool-allowlist', 'allow', 'search_funds', 0),
        tool('search_funds', 0),
        model(1, ['calculate_fees', 'calculate_fees']),
        model(2, [], 'Odpověď'),
        end('completed', 3),
      ),
    );
    expect(beats.map((b) => [b.actor, b.text])).toEqual([
      ['user', t.start.klient],
      ['rules', t.toolsHidden(t.toolName.draft_email)],
      ['model', t.wants(t.toolName.search_funds)],
      ['tools', t.tool.search_funds],
      ['model', t.wants(`${t.toolName.calculate_fees} ×2`)],
      ['model', t.answers],
      ['user', cs.agent.result.status.completed],
    ]);
    expect(beats[3]?.checked).toBe(true);
    expect(beats[2]?.note).toBe(t.tokens('1 200'));
    expect(beats.at(-1)).toMatchObject({ tone: 'end', status: 'completed' });
    expect(beats.at(-1)?.note).toBe(t.summary(3, '1 000'));
  });

  it('without guardrails the tools run unchecked and the rules column stays empty', () => {
    const beats = toBeats(
      trace(start('klient'), model(0, ['search_funds']), tool('search_funds', 0)),
    );
    expect(beats.some((b) => b.actor === 'rules')).toBe(false);
    expect(beats.at(-1)?.checked).toBeUndefined();
  });

  it('checks on a tool result come after the tool row, not before', () => {
    const beats = toBeats(
      trace(
        start('poradce'),
        decide('tool-allowlist', 'allow'),
        model(0, ['search_funds']),
        decide('tool-allowlist', 'allow', 'search_funds', 0),
        decide('prompt-injection', 'modify', 'search_funds', 0),
        {
          type: 'pii',
          name: 'pseudonymize',
          step: 0,
          input: { target: 'tool_output:search_funds' },
          output: { replaced: 1, byType: { PERSON: 1 }, placeholders: ['<OSOBA_2>'] },
        },
        tool('search_funds', 0),
      ),
    );
    expect(beats.slice(1).map((b) => b.text)).toEqual([
      t.toolsOffered,
      t.wants(t.toolName.search_funds),
      t.tool.search_funds,
      t.injection,
      t.maskedTool(1),
    ]);
    expect(beats.at(-1)?.chips).toEqual(['<OSOBA_2>']);
  });

  it('a failing service: error rows, then the loop rule stops the run', () => {
    const beats = toBeats(
      trace(
        start('klient'),
        model(2, ['search_funds']),
        decide('tool-allowlist', 'allow', 'search_funds', 2),
        decide('loop-detection', 'deny', 'search_funds', 2),
        tool('search_funds', 2, false),
        end('stopped_by_policy', 3),
      ),
    );
    expect(beats.slice(2).map((b) => [b.actor, b.tone, b.text])).toEqual([
      ['tools', 'block', t.toolError(t.toolName.search_funds)],
      ['rules', 'block', t.loop],
      ['user', 'end', cs.agent.result.status.stopped_by_policy],
    ]);
  });

  it('an e-mail draft waits for a person, who approves it', () => {
    const beats = toBeats(
      trace(
        start('poradce'),
        model(2, ['draft_email']),
        decide('human-approval', 'require_approval', 'draft_email', 2),
        decide('human-approval', 'allow', 'draft_email', 2),
        tool('draft_email', 2),
      ),
    );
    expect(beats.slice(2).map((b) => [b.actor, b.text])).toEqual([
      ['user', t.approvalWait],
      ['user', t.approved],
      ['tools', t.tool.draft_email],
    ]);
    expect(beats.at(-1)?.checked).toBe(true);
  });

  it('personal data: placeholders go to the model, values come back only locally', () => {
    const beats = toBeats(
      trace(
        start('klient'),
        {
          type: 'pii',
          name: 'pseudonymize',
          input: { target: 'user_message' },
          output: { replaced: 2, placeholders: ['<OSOBA_1>', '<RODNÉ_ČÍSLO_1>'] },
        },
        { type: 'pii', name: 'reidentify', step: 2, output: { restored: 1, unknown: [] } },
      ),
    );
    expect(beats[1]).toMatchObject({
      actor: 'rules',
      text: t.masked(2),
      chips: ['<OSOBA_1>', '<RODNÉ_ČÍSLO_1>'],
    });
    expect(beats[2]?.text).toBe(t.restored(1));
  });

  it('blocks: advice, budgets, denied tools, bad arguments and unknown events', () => {
    const beats = toBeats(
      trace(
        decide('content-advice', 'deny'),
        decide('content-advice', 'modify', undefined, 1),
        decide('step-budget', 'deny', undefined, 5),
        decide('tool-allowlist', 'deny', 'draft_email', 0),
        decide('tool-args', 'deny', 'calculate_fees', 0),
        { type: 'error', error: { name: 'Error', message: 'x' } },
        { type: 'info', name: 'something_new' },
      ),
    );
    expect(beats.map((b) => b.text)).toEqual([
      t.adviceRefused,
      t.adviceRemoved,
      t.budget,
      t.denied(t.toolName.draft_email),
      t.badArgs(t.toolName.calculate_fees),
      t.error,
      t.other,
    ]);
  });
});
