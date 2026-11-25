import { CreateMLCEngine, deleteModelAllInfoInCache, type MLCEngine } from '@mlc-ai/web-llm';
import { serialiseResource } from '../network/resource.ts';
import { appConfig } from './model.ts';
import type { FromWorker, ToWorker } from './worker-protocol.ts';

/**
 * The only place WebLLM runs. Loads the model, streams answers back and reports every network
 * request it makes, so the page can show them on the network panel.
 */
const post = (message: FromWorker) => self.postMessage(message);
let engine: MLCEngine | undefined;

new PerformanceObserver((list) => {
  const entries = list
    .getEntries()
    .map((e) => serialiseResource(e as PerformanceResourceTiming, 'worker'));
  if (entries.length) post({ type: 'resources', entries });
}).observe({ type: 'resource', buffered: true });

self.onmessage = (e: MessageEvent<ToWorker>) => {
  void handle(e.data);
};

async function handle(msg: ToWorker) {
  if (msg.type === 'interrupt') {
    void engine?.interruptGenerate();
    return;
  }
  try {
    if (msg.type === 'load') {
      await engine?.unload();
      engine = await CreateMLCEngine(msg.modelId, {
        appConfig: appConfig(),
        initProgressCallback: (r) =>
          post({ type: 'progress', id: msg.id, fraction: r.progress, text: r.text }),
      });
      post({ type: 'loaded', id: msg.id });
    } else if (msg.type === 'generate') {
      if (!engine) throw new Error('Model is not loaded');
      const stream = await engine.chat.completions.create(msg.request);
      for await (const chunk of stream) post({ type: 'chunk', id: msg.id, chunk });
      post({ type: 'done', id: msg.id });
    } else {
      await engine?.unload();
      engine = undefined;
      await deleteModelAllInfoInCache(msg.modelId, appConfig());
      post({ type: 'done', id: msg.id });
    }
  } catch (err) {
    post({
      type: 'error',
      id: msg.id,
      message: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    });
  }
}
