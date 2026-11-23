import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReplayMissError, ReplayProvider } from './replay-provider.ts';
import { fixtureRecording } from './test-fixtures.ts';
import type { LlmRequest } from './types.ts';

const request = (step: number, scenario = 'test-scenario'): LlmRequest => ({
  messages: [{ role: 'user', content: 'Najdi akciové fondy' }],
  context: { scenario, step },
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ReplayProvider', () => {
  it('returns the recorded response for scenario + step', async () => {
    const provider = new ReplayProvider([fixtureRecording]);
    const res = await provider.complete(request(0));

    expect(provider.id).toBe('replay');
    expect(res).toEqual({
      ...fixtureRecording.steps[0]?.response,
      model: 'fixture',
      provider: 'replay',
    });
  });

  it('is deterministic and immune to callers mutating the result', async () => {
    const provider = new ReplayProvider([fixtureRecording]);
    const first = await provider.complete(request(1));
    first.content = 'mutated';
    first.toolCalls.push({ id: 'x', name: 'x', arguments: null });

    const second = await provider.complete(request(1));
    expect(second.content).toBe('Hotovo.');
    expect(second.toolCalls).toEqual([]);
  });

  it('throws ReplayMissError for an unknown step or scenario', async () => {
    const provider = new ReplayProvider([fixtureRecording]);
    await expect(provider.complete(request(99))).rejects.toBeInstanceOf(ReplayMissError);
    await expect(provider.complete(request(0, 'other'))).rejects.toThrow(
      /scenario "other", step 0/,
    );
  });

  it('throws ReplayMissError when the request has no context', async () => {
    const provider = new ReplayProvider([fixtureRecording]);
    await expect(provider.complete({ messages: [] })).rejects.toBeInstanceOf(ReplayMissError);
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const provider = new ReplayProvider([fixtureRecording]);
    const controller = new AbortController();
    controller.abort();
    await expect(provider.complete(request(0), controller.signal)).rejects.toThrow();
  });

  it('rejects when aborted during the artificial delay', async () => {
    vi.useFakeTimers();
    const provider = new ReplayProvider([fixtureRecording], { delayMs: 1000 });
    const controller = new AbortController();
    const pending = provider.complete(request(0), controller.signal);
    controller.abort(new Error('user cancelled'));
    await expect(pending).rejects.toThrow('user cancelled');
  });

  it('resolves after the artificial delay', async () => {
    vi.useFakeTimers();
    const provider = new ReplayProvider([fixtureRecording], { delayMs: 1000 });
    const pending = provider.complete(request(0));
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toMatchObject({ stopReason: 'tool_use' });
  });

  it('rejects two recordings for the same scenario', () => {
    expect(() => new ReplayProvider([fixtureRecording, fixtureRecording])).toThrow(/Duplicate/);
  });

  it('exposes recording provenance for the UI', () => {
    const provider = new ReplayProvider([fixtureRecording]);
    expect(provider.getRecording('test-scenario')).toMatchObject({
      kind: 'fixture',
      model: 'fixture',
      promptVersion: 'test-v1',
    });
    expect(provider.getRecording('missing')).toBeUndefined();
  });
});
