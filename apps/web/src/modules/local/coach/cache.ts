import { modelUrl, type ModelVariant } from './model.ts';

/** Cache API scope WebLLM (via tvmjs) stores model weights in. */
const MODEL_CACHE = 'webllm/model';

/**
 * Is the model fully in the browser cache? Reads the Cache API directly, so the page can say
 * "already downloaded" without loading WebLLM first (that would be a download before the click).
 * Mirrors WebLLM's own check: the tensor manifest and every shard it lists.
 */
export async function isModelCached(v: ModelVariant): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    if (!(await caches.has(MODEL_CACHE))) return false;
    const cache = await caches.open(MODEL_CACHE);
    const base = modelUrl(v);
    const manifest = await cache.match(new URL('tensor-cache.json', base).href);
    if (!manifest) return false;
    const { records } = (await manifest.json()) as { records?: { dataPath: string }[] };
    if (!records?.length) return false;
    const hits = await Promise.all(records.map((r) => cache.match(new URL(r.dataPath, base).href)));
    return hits.every(Boolean);
  } catch {
    return false;
  }
}

const SCOPES = ['webllm/model', 'webllm/config', 'webllm/wasm'] as const;

/**
 * Removes this model's files from the browser cache (weights, config, compiled library),
 * directly through the Cache API, so deleting does not first download WebLLM.
 */
export async function deleteCachedModel(v: ModelVariant): Promise<void> {
  if (typeof caches === 'undefined') return;
  const base = modelUrl(v);
  for (const scope of SCOPES) {
    if (!(await caches.has(scope))) continue;
    const cache = await caches.open(scope);
    for (const request of await cache.keys()) {
      if (request.url.startsWith(base) || request.url.endsWith(`/${v.libFile}`))
        await cache.delete(request);
    }
  }
}
