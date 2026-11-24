import type {
  WebLlmChunk,
  WebLlmEngine,
  WebLlmStreamingRequest,
} from '@trusted-ai-lab/llm-core/webllm';
import type { SerialisedResource } from '../network/resource.ts';
import type { FromWorker, ToWorker, WorkerLike } from './worker-protocol.ts';

export interface LoadProgress {
  fraction: number;
  text: string;
}

interface Pending {
  resolve: () => void;
  reject: (err: Error) => void;
  onProgress?: (p: LoadProgress) => void;
  onChunk?: (chunk: WebLlmChunk) => void;
}

/** Rejections carry the worker's message: WebLLM errors cross the boundary as plain text. */
export class WorkerError extends Error {
  override readonly name = 'WorkerError';
}

/**
 * Page side of the model worker. Implements the engine interface `WebLlmProvider` needs, so the
 * provider does not know (or care) that the model runs in another thread.
 */
export class LocalModelClient {
  readonly engine: WebLlmEngine;
  private readonly worker: WorkerLike;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;

  constructor(worker: WorkerLike, onResources: (entries: SerialisedResource[]) => void) {
    this.worker = worker;
    worker.addEventListener('message', (e) => this.receive(e.data, onResources));
    worker.addEventListener('error', (e) =>
      this.failAll(new WorkerError(e.message || 'Worker failed')),
    );
    this.engine = {
      chat: { completions: { create: (request) => Promise.resolve(this.stream(request)) } },
      interruptGenerate: () => this.post({ type: 'interrupt' }),
    };
  }

  load(modelId: string, onProgress: (p: LoadProgress) => void): Promise<void> {
    return this.call((id) => ({ type: 'load', id, modelId }), { onProgress });
  }

  deleteCached(modelId: string): Promise<void> {
    return this.call((id) => ({ type: 'delete', id, modelId }), {});
  }

  terminate(): void {
    this.worker.terminate();
    this.failAll(new DOMException('Aborted', 'AbortError'));
  }

  private async *stream(request: WebLlmStreamingRequest): AsyncGenerator<WebLlmChunk> {
    const queue: WebLlmChunk[] = [];
    let wake: (() => void) | undefined;
    let finished = false;
    let failure: Error | undefined;
    const done = this.call((id) => ({ type: 'generate', id, request }), {
      onChunk: (chunk) => {
        queue.push(chunk);
        wake?.();
      },
    }).then(
      () => (finished = true),
      (err: Error) => (failure = err),
    );
    for (;;) {
      if (queue.length) {
        yield queue.shift()!;
        continue;
      }
      if (failure) throw failure;
      if (finished) break;
      await Promise.race([new Promise<void>((r) => (wake = r)), done]);
      wake = undefined;
    }
  }

  private call(message: (id: number) => ToWorker, handlers: Omit<Pending, 'resolve' | 'reject'>) {
    const id = this.nextId++;
    return new Promise<void>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, ...handlers });
      this.post(message(id));
    });
  }

  private post(message: ToWorker) {
    this.worker.postMessage(message);
  }

  private receive(msg: FromWorker, onResources: (entries: SerialisedResource[]) => void) {
    if (msg.type === 'resources') {
      onResources(msg.entries);
      return;
    }
    const p = this.pending.get(msg.id);
    if (!p) return;
    if (msg.type === 'progress') p.onProgress?.({ fraction: msg.fraction, text: msg.text });
    else if (msg.type === 'chunk') p.onChunk?.(msg.chunk);
    else {
      this.pending.delete(msg.id);
      if (msg.type === 'error') p.reject(new WorkerError(msg.message));
      else p.resolve();
    }
  }

  private failAll(err: Error) {
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
  }
}
