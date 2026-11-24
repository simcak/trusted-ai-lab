import type { SerialisedResource } from '../network/resource.ts';
import { LocalModelClient } from './worker-client.ts';

/** Starts the model worker. Its script (with WebLLM inside) is fetched only now, after a click. */
export function startModelWorker(
  onResources: (entries: SerialisedResource[]) => void,
): LocalModelClient {
  const worker = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' });
  return new LocalModelClient(worker, onResources);
}

export type LoadErrorKind = 'webgpu' | 'shader_f16' | 'memory' | 'storage' | 'network' | 'unknown';

/** WebLLM errors arrive as text from the worker, so they are recognised by name and message. */
export function classifyLoadError(err: unknown): LoadErrorKind {
  const text = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  if (/WebGPUNotAvailable|WebGPU is not supported/i.test(text)) return 'webgpu';
  if (/ShaderF16|shader-f16/i.test(text)) return 'shader_f16';
  if (/QuotaExceeded|quota/i.test(text)) return 'storage';
  if (
    /out of memory|device (was )?lost|DeviceLost|allocat|maxStorageBufferBindingSize|buffer size/i.test(
      text,
    )
  ) {
    return 'memory';
  }
  if (/Failed to fetch|NetworkError|network|load failed/i.test(text)) return 'network';
  return 'unknown';
}
