import { describe, expect, it, vi } from 'vitest';
import { LlmProviderError } from './types.ts';
import {
  createWebLlmProvider,
  stripThinking,
  toWebLlmMessages,
  type WebLlmChunk,
  type WebLlmEngine,
  type WebLlmStreamingRequest,
} from './webllm-provider.ts';

const MODEL = 'Qwen3-0.6B-q4f16_1-MLC';

function chunk(
  content: string | null,
  finish: WebLlmChunk['choices'][number]['finish_reason'] = null,
): WebLlmChunk {
  return { model: MODEL, choices: [{ delta: { content }, finish_reason: finish }] };
}

const usageChunk: WebLlmChunk = {
  model: MODEL,
  choices: [],
  usage: {
    prompt_tokens: 120,
    completion_tokens: 3,
    extra: { decode_tokens_per_s: 41.5, prefill_tokens_per_s: 300, time_to_first_token_s: 0.4 },
  },
};

/** Fake engine that streams the given chunks and records the request. */
function fakeEngine(chunks: WebLlmChunk[], options: { beforeChunk?: (i: number) => void } = {}) {
  const requests: WebLlmStreamingRequest[] = [];
  const interrupt = vi.fn<() => void>();
  const engine: WebLlmEngine = {
    chat: {
      completions: {
        create(request) {
          requests.push(request);
          return Promise.resolve(
            (async function* () {
              for (const [i, c] of chunks.entries()) {
                options.beforeChunk?.(i);
                await Promise.resolve();
                yield c;
              }
            })(),
          );
        },
      },
    },
    interruptGenerate: interrupt,
  };
  return { engine, requests, interrupt };
}

describe('createWebLlmProvider', () => {
  it('streams text, then returns the whole answer with usage and speed', async () => {
    const { engine, requests } = fakeEngine([
      chunk('Dobrá '),
      chunk('práce'),
      chunk('.', 'stop'),
      usageChunk,
    ]);
    const deltas: string[] = [];
    const onStats = vi.fn();
    const provider = createWebLlmProvider({
      engine,
      model: MODEL,
      extraBody: { enable_thinking: false },
      onText: (d) => deltas.push(d),
      onStats,
    });

    const res = await provider.complete({
      system: 'Jsi trenér.',
      messages: [{ role: 'user', content: '{}' }],
    });

    expect(deltas).toEqual(['Dobrá ', 'práce', '.']);
    expect(res).toMatchObject({
      content: 'Dobrá práce.',
      toolCalls: [],
      stopReason: 'stop',
      usage: { inputTokens: 120, outputTokens: 3 },
      model: MODEL,
      provider: 'webllm',
    });
    expect(onStats).toHaveBeenCalledWith({
      decodeTokensPerSecond: 41.5,
      prefillTokensPerSecond: 300,
      timeToFirstTokenSeconds: 0.4,
    });
    expect(requests[0]).toEqual({
      messages: [
        { role: 'system', content: 'Jsi trenér.' },
        { role: 'user', content: '{}' },
      ],
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: 512,
      extra_body: { enable_thinking: false },
    });
  });

  it('maps a length stop to max_tokens and honours the request limit', async () => {
    const { engine, requests } = fakeEngine([chunk('…', 'length'), usageChunk]);
    const res = await createWebLlmProvider({ engine, model: MODEL }).complete({
      messages: [{ role: 'user', content: 'x' }],
      maxTokens: 64,
    });
    expect(res.stopReason).toBe('max_tokens');
    expect(requests[0]?.max_tokens).toBe(64);
  });

  it('interrupts generation and rejects with AbortError when aborted', async () => {
    const controller = new AbortController();
    const { engine, interrupt } = fakeEngine([chunk('a'), chunk('b'), chunk('c', 'stop')], {
      beforeChunk: (i) => i === 1 && controller.abort(),
    });
    const promise = createWebLlmProvider({ engine, model: MODEL }).complete(
      { messages: [{ role: 'user', content: 'x' }] },
      controller.signal,
    );
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(interrupt).toHaveBeenCalledOnce();
  });

  it('turns string errors from the worker into provider errors', async () => {
    const engine: WebLlmEngine = {
      chat: {
        completions: {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the worker engine rejects with strings
          create: () => Promise.reject('Error: Device was lost'),
        },
      },
      interruptGenerate: () => undefined,
    };
    const promise = createWebLlmProvider({ engine, model: MODEL }).complete({
      messages: [{ role: 'user', content: 'x' }],
    });
    await expect(promise).rejects.toBeInstanceOf(LlmProviderError);
    await expect(promise).rejects.toMatchObject({
      code: 'unknown',
      message: 'Error: Device was lost',
    });
  });
});

describe('toWebLlmMessages', () => {
  it('rejects tools and tool results', () => {
    expect(() =>
      toWebLlmMessages({
        messages: [{ role: 'user', content: 'x' }],
        tools: [{ name: 't', description: 'd', inputSchema: {} }],
      }),
    ).toThrow(LlmProviderError);
    expect(() =>
      toWebLlmMessages({ messages: [{ role: 'tool', toolCallId: '1', content: '{}' }] }),
    ).toThrow(LlmProviderError);
  });
});

describe('stripThinking', () => {
  it('removes a leading think block, also an empty one', () => {
    expect(stripThinking('<think>\n\n</think>\n\nAhoj')).toBe('Ahoj');
    expect(stripThinking('<think>hmm')).toBe('');
    expect(stripThinking('Bez přemýšlení')).toBe('Bez přemýšlení');
  });
});
