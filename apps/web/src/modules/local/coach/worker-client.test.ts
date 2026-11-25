import { describe, expect, it, vi } from 'vitest';
import type { SerialisedResource } from '../network/resource.ts';
import { classifyLoadError } from './engine.ts';
import { LocalModelClient, WorkerError } from './worker-client.ts';
import type { FromWorker, ToWorker, WorkerLike } from './worker-protocol.ts';

/** A worker that answers with scripted messages. */
function fakeWorker(script: (msg: ToWorker, reply: (m: FromWorker) => void) => void) {
  let listener: ((e: MessageEvent<FromWorker>) => void) | undefined;
  const sent: ToWorker[] = [];
  const reply = (m: FromWorker) =>
    queueMicrotask(() => listener?.({ data: m } as MessageEvent<FromWorker>));
  const worker: WorkerLike = {
    postMessage(msg) {
      sent.push(msg);
      script(msg, reply);
    },
    addEventListener(type: string, l: unknown) {
      if (type === 'message') listener = l as typeof listener;
    },
    terminate: vi.fn(),
  };
  return { worker, sent, reply };
}

const chunk = (content: string, finish: 'stop' | null = null) => ({
  model: 'm',
  choices: [{ delta: { content }, finish_reason: finish }],
});

describe('LocalModelClient', () => {
  it('reports load progress and resolves when the worker has loaded the model', async () => {
    const { worker } = fakeWorker((msg, reply) => {
      if (msg.type !== 'load') return;
      reply({ type: 'progress', id: msg.id, fraction: 0.5, text: 'půl' });
      reply({ type: 'loaded', id: msg.id });
    });
    const progress = vi.fn();
    await new LocalModelClient(worker, () => undefined).load('Qwen3-0.6B-q4f16_1-MLC', progress);
    expect(progress).toHaveBeenCalledWith({ fraction: 0.5, text: 'půl' });
  });

  it('streams chunks through the engine interface', async () => {
    const { worker } = fakeWorker((msg, reply) => {
      if (msg.type !== 'generate') return;
      reply({ type: 'chunk', id: msg.id, chunk: chunk('Ahoj ') });
      reply({ type: 'chunk', id: msg.id, chunk: chunk('světe', 'stop') });
      reply({ type: 'done', id: msg.id });
    });
    const client = new LocalModelClient(worker, () => undefined);
    const stream = await client.engine.chat.completions.create({
      messages: [{ role: 'user', content: 'x' }],
      stream: true,
      stream_options: { include_usage: true },
    });
    const texts: string[] = [];
    for await (const c of stream) texts.push(c.choices[0]?.delta.content ?? '');
    expect(texts).toEqual(['Ahoj ', 'světe']);
  });

  it('turns worker errors into rejections and forwards network entries', async () => {
    const resources: SerialisedResource[][] = [];
    const entry: SerialisedResource = {
      url: 'https://huggingface.co/x',
      start: 1,
      transferBytes: 0,
      initiator: 'fetch',
      source: 'worker',
    };
    const { worker } = fakeWorker((msg, reply) => {
      if (msg.type !== 'load') return;
      reply({ type: 'resources', entries: [entry] });
      reply({
        type: 'error',
        id: msg.id,
        message: 'WebGPUNotAvailableError: WebGPU is not supported',
      });
    });
    const client = new LocalModelClient(worker, (e) => resources.push(e));
    const err = await client.load('m', () => undefined).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WorkerError);
    expect(classifyLoadError(err)).toBe('webgpu');
    expect(resources).toEqual([[entry]]);
  });

  it('sends interrupt for the provider abort', () => {
    const { worker, sent } = fakeWorker(() => undefined);
    void new LocalModelClient(worker, () => undefined).engine.interruptGenerate();
    expect(sent).toEqual([{ type: 'interrupt' }]);
  });
});

describe('classifyLoadError', () => {
  it('recognises the usual WebLLM failures', () => {
    expect(
      classifyLoadError('ShaderF16SupportError: This model requires WebGPU extension shader-f16'),
    ).toBe('shader_f16');
    expect(classifyLoadError(new Error('GPUDevice was lost: out of memory'))).toBe('memory');
    expect(classifyLoadError(new Error('QuotaExceededError'))).toBe('storage');
    expect(classifyLoadError(new TypeError('Failed to fetch'))).toBe('network');
    expect(classifyLoadError('something else')).toBe('unknown');
  });
});
