import type { WebLlmChunk, WebLlmStreamingRequest } from '@trusted-ai-lab/llm-core/webllm';
import type { SerialisedResource } from '../network/resource.ts';

/**
 * Messages between the page and the model worker. The page never imports WebLLM itself: the
 * library (≈ 2.3 MB gzip) is downloaded once, by the worker, after the visitor asks for the model.
 */
export type ToWorker =
  | { type: 'load'; id: number; modelId: string }
  | { type: 'generate'; id: number; request: WebLlmStreamingRequest }
  | { type: 'interrupt' }
  | { type: 'delete'; id: number; modelId: string };

export type FromWorker =
  | { type: 'progress'; id: number; fraction: number; text: string }
  | { type: 'loaded'; id: number }
  | { type: 'chunk'; id: number; chunk: WebLlmChunk }
  | { type: 'done'; id: number }
  | { type: 'error'; id: number; message: string }
  /** Every network request the worker makes; the page's PerformanceObserver cannot see them. */
  | { type: 'resources'; entries: SerialisedResource[] };

/** The part of `Worker` the client uses (a fake in tests). */
export interface WorkerLike {
  postMessage(message: ToWorker): void;
  addEventListener(type: 'message', listener: (e: MessageEvent<FromWorker>) => void): void;
  addEventListener(type: 'error', listener: (e: ErrorEvent) => void): void;
  terminate(): void;
}
