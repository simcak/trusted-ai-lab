import { describe, expect, it } from 'vitest';
import { ReplayProvider } from './replay-provider.ts';
import { fixtureRecording } from './test-fixtures.ts';
import { createTraceLog } from './trace.ts';
import type { LlmRequest } from './types.ts';
import { withTracing } from './with-tracing.ts';

const fixedClock = () => new Date('2026-11-23T10:00:00.000Z');

describe('withTracing', () => {
  it('emits an llm_call event with input, output, tokens and latency', async () => {
    const log = createTraceLog({ now: fixedClock });
    const provider = withTracing(new ReplayProvider([fixtureRecording]), log);
    const req: LlmRequest = {
      messages: [{ role: 'user', content: 'Ahoj' }],
      context: { scenario: 'test-scenario', step: 0 },
    };

    const res = await provider.complete(req);

    expect(provider.id).toBe('replay');
    expect(log.getSnapshot()).toEqual([
      {
        id: 'evt-0001',
        seq: 1,
        timestamp: '2026-11-23T10:00:00.000Z',
        type: 'llm_call',
        name: 'replay',
        scenario: 'test-scenario',
        step: 0,
        input: req,
        output: { content: res.content, toolCalls: res.toolCalls, stopReason: 'tool_use' },
        usage: { inputTokens: 120, outputTokens: 18 },
        latencyMs: 640,
        provider: 'replay',
        model: 'fixture',
      },
    ]);
  });

  it('emits an error event and rethrows when the provider fails', async () => {
    const log = createTraceLog({ now: fixedClock });
    const provider = withTracing(new ReplayProvider([fixtureRecording]), log);

    await expect(
      provider.complete({ messages: [], context: { scenario: 'test-scenario', step: 42 } }),
    ).rejects.toThrow('step 42');

    const [event] = log.getSnapshot();
    expect(event).toMatchObject({
      type: 'error',
      step: 42,
      provider: 'replay',
      error: { name: 'ReplayMissError' },
    });
  });

  it('never puts providerState into the trace', async () => {
    const log = createTraceLog({ now: fixedClock });
    const provider = withTracing(new ReplayProvider([fixtureRecording]), log);
    await provider.complete({
      messages: [
        { role: 'user', content: 'Ahoj' },
        { role: 'assistant', content: 'Ahoj', providerState: [{ signature: 'secret-sig' }] },
        { role: 'user', content: 'Dál' },
      ],
      context: { scenario: 'test-scenario', step: 1 },
    });
    expect(JSON.stringify(log.getSnapshot())).not.toContain('secret-sig');
  });

  it('in delta mode shows the system prompt once and then only new messages', async () => {
    const log = createTraceLog({ now: fixedClock });
    const provider = withTracing(new ReplayProvider([fixtureRecording]), log, { input: 'delta' });
    const tools = [{ name: 'search_funds', description: '', inputSchema: {} }];
    const first: LlmRequest = {
      system: 'Systém',
      tools,
      messages: [{ role: 'user', content: 'Ahoj' }],
      context: { scenario: 'test-scenario', step: 0 },
    };
    await provider.complete(first);
    await provider.complete({
      ...first,
      messages: [
        ...first.messages,
        { role: 'assistant', content: '', toolCalls: [] },
        { role: 'tool', toolCallId: 'call-1', content: '[]' },
      ],
      context: { scenario: 'test-scenario', step: 1 },
    });

    const [a, b] = log.getSnapshot();
    expect(a?.input).toEqual({
      system: 'Systém',
      tools: ['search_funds'],
      maxTokens: undefined,
      messageCount: 1,
      newMessages: [{ role: 'user', content: 'Ahoj' }],
    });
    expect(b?.input).toMatchObject({ messageCount: 3, tools: ['search_funds'] });
    expect(b?.input).not.toHaveProperty('system');
    expect((b?.input as { newMessages: unknown[] }).newMessages).toHaveLength(2);
  });
});
