import type { TokenClassifier } from '@trusted-ai-lab/pii-cz';
import runtimeMjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';
import runtimeWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import { NER_MODEL } from '../../../../../../evals/pii/ner-model.ts';

/**
 * Uncompressed size of the ONNX Runtime WebAssembly binary served from this site
 * (onnxruntime-web 1.31.0-dev.20260914, dist/ort-wasm-simd-threaded.asyncify.wasm).
 * The transfer is smaller when the server compresses it; the page shows the measured value.
 */
export const RUNTIME_WASM_BYTES = 26_861_777;

export interface NerProgress {
  loaded: number;
  total: number;
}

export interface LoadedNer {
  classify: TokenClassifier;
  /** Bytes the browser reports for the runtime files (Resource Timing), if available. */
  runtimeTransferBytes: number | undefined;
}

function runtimeTransfer(): number | undefined {
  const entries = performance
    .getEntriesByType('resource')
    .filter((e): e is PerformanceResourceTiming => e.name.includes('ort-wasm-simd-threaded'));
  if (entries.length === 0) return undefined;
  return entries.reduce((sum, e) => sum + (e.transferSize || e.encodedBodySize), 0);
}

/**
 * Loads the NER pipeline on demand. `@huggingface/transformers` is imported dynamically, so it
 * is a separate chunk fetched only after the user clicks. The ONNX Runtime binary is served from
 * this site (same version as in the lockfile) instead of the library's default CDN; only the
 * model files come from huggingface.co.
 */
export async function loadNerClassifier(
  onProgress: (progress: NerProgress) => void,
): Promise<LoadedNer> {
  const { env, pipeline } = await import('@huggingface/transformers');
  env.allowLocalModels = false;
  const wasm = env.backends.onnx.wasm;
  if (wasm) wasm.wasmPaths = { mjs: runtimeMjsUrl, wasm: runtimeWasmUrl };

  const files = new Map<string, number>();
  const classifier = await pipeline('token-classification', NER_MODEL.id, {
    dtype: NER_MODEL.dtype,
    revision: NER_MODEL.revision,
    device: 'wasm',
    progress_callback: (info) => {
      if (info.status !== 'progress') return;
      files.set(info.file, info.loaded);
      let loaded = 0;
      for (const bytes of files.values()) loaded += bytes;
      onProgress({ loaded, total: NER_MODEL.downloadBytes });
    },
  });
  return { classify: (text) => classifier(text), runtimeTransferBytes: runtimeTransfer() };
}
