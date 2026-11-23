/**
 * Records NER predictions for the corpus — run locally, never in CI (downloads the model from
 * Hugging Face, ~15 MB, cached in node_modules/.cache/hf).
 *
 *   node evals/pii/run-ner.ts && node evals/pii/run.ts
 *
 * Output: evals/pii/ner-predictions.json (model id + pinned revision, runtime version, date,
 * corpus hash). run.ts then merges these cached predictions with the current rule detectors.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env, pipeline } from '@huggingface/transformers';
import { createNerDetector } from '@trusted-ai-lab/pii-cz';
import { NER_MODEL } from './ner-model.ts';
import { CORPUS_FILE, NER_FILE, corpusHash, loadCorpus } from './run.ts';
import { NerPredictionsSchema, type NerPredictions } from './schema.ts';

const rootPackage = (await import('../../package.json', { with: { type: 'json' } })).default as {
  devDependencies: Record<string, string>;
};

env.cacheDir = resolve(import.meta.dirname, '../../node_modules/.cache/hf');
env.allowLocalModels = false;

const corpus = loadCorpus();
console.log(`Corpus ${CORPUS_FILE}: ${corpus.documents.length} documents`);
console.log(`Loading ${NER_MODEL.id}@${NER_MODEL.revision.slice(0, 7)} (${NER_MODEL.dtype})…`);

const classifier = await pipeline('token-classification', NER_MODEL.id, {
  dtype: NER_MODEL.dtype,
  revision: NER_MODEL.revision,
});
const ner = createNerDetector((text) => classifier(text), NER_MODEL.detector);

const started = performance.now();
const predictions: NerPredictions['predictions'] = {};
for (const doc of corpus.documents) {
  const findings = await ner(doc.text);
  predictions[doc.id] = findings.map((f) => ({ start: f.start, end: f.end, score: f.score }));
}
const durationMs = Math.round(performance.now() - started);

const output = NerPredictionsSchema.parse({
  schemaVersion: 1,
  model: {
    id: NER_MODEL.id,
    revision: NER_MODEL.revision,
    dtype: NER_MODEL.dtype,
    runtime: '@huggingface/transformers (Node, onnxruntime-node, CPU)',
    runtimeVersion: rootPackage.devDependencies['@huggingface/transformers'] ?? 'unknown',
  },
  detector: NER_MODEL.detector,
  recordedAt: new Date().toISOString(),
  corpusHash: corpusHash(corpus),
  durationMs,
  predictions,
});
writeFileSync(NER_FILE, `${JSON.stringify(output, null, 2)}\n`);
const total = Object.values(predictions).reduce((n, p) => n + p.length, 0);
console.log(`Wrote ${NER_FILE}: ${total} PER spans in ${durationMs} ms. Now run: pnpm eval:pii`);
