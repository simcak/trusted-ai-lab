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
});
