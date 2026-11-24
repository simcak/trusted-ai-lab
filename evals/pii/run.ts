/**
 * PII eval: runs pii-cz over the synthetic corpus and writes evals/pii/results.json — the only
 * source of the numbers shown on the #/pii page.
 *
 *   node evals/pii/run.ts           # write results.json
 *   node evals/pii/run.ts --check   # recompute and fail if results.json differs (CI)
 *
 * Configurations:
 *   rules      — rule detectors only (deterministic, no network);
 *   rules+ner  — rules merged with cached NER predictions from ner-predictions.json
 *                (produced locally by run-ner.ts; CI never downloads the model).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DEFAULT_MIN_SCORE,
  VERSION,
  detect,
  mergeFindings,
  type Finding,
} from '@trusted-ai-lab/pii-cz';
import { evaluate, type EvalCase } from '@trusted-ai-lab/pii-cz/eval';
import {
  CorpusSchema,
  NerPredictionsSchema,
  ResultsSchema,
  type Corpus,
  type NerPredictions,
  type Results,
  type Split,
} from './schema.ts';

const dir = import.meta.dirname;
export const CORPUS_FILE = resolve(dir, '../../data/pii/corpus.json');
export const NER_FILE = resolve(dir, 'ner-predictions.json');
const RESULTS_FILE = resolve(dir, 'results.json');

/** Error examples are kept for the reported split only, to keep results.json small. */
const ERRORS_PER_TYPE = { dev: 0, test: 5 } as const;

export function loadCorpus(): Corpus {
  return CorpusSchema.parse(JSON.parse(readFileSync(CORPUS_FILE, 'utf8')));
}

export function corpusHash(corpus: Corpus): string {
  return createHash('sha256').update(JSON.stringify(corpus.documents)).digest('hex');
}

function nerFindings(text: string, predictions: NerPredictions['predictions'][string]): Finding[] {
  return predictions.map((p) => ({
    type: 'PERSON',
    start: p.start,
    end: p.end,
    text: text.slice(p.start, p.end),
    score: p.score,
    detector: 'ner',
    reasons: ['ner_model'],
  }));
}

function runConfig(corpus: Corpus, ner: NerPredictions | undefined) {
  const today = new Date(`${corpus.referenceDate}T00:00:00Z`);
  const bySplit = { dev: [] as EvalCase[], test: [] as EvalCase[] };
  for (const doc of corpus.documents) {
    let findings = detect(doc.text, { today });
    if (ner) {
      const predicted = ner.predictions[doc.id];
      if (!predicted) throw new Error(`ner-predictions.json has no entry for ${doc.id}`);
      findings = mergeFindings(findings, nerFindings(doc.text, predicted), { today });
    }
    bySplit[doc.split].push({ id: doc.id, text: doc.text, gold: doc.spans, predicted: findings });
  }
  const report = (split: Split) =>
    evaluate(bySplit[split], { maxErrorsPerType: ERRORS_PER_TYPE[split] });
  return { dev: report('dev'), test: report('test') };
}

/** The model on its own, persons only — shows what the rules contribute (ADR „validators before ML"). */
function runNerOnly(corpus: Corpus, ner: NerPredictions) {
  const bySplit = { dev: [] as EvalCase[], test: [] as EvalCase[] };
  for (const doc of corpus.documents) {
    bySplit[doc.split].push({
      id: doc.id,
      text: doc.text,
      gold: doc.spans,
      predicted: nerFindings(doc.text, ner.predictions[doc.id] ?? []),
    });
  }
  const person = (split: Split) =>
    evaluate(bySplit[split], { types: ['PERSON'], maxErrorsPerType: 0 }).perType.PERSON;
  return { dev: person('dev'), test: person('test') };
}

export function computeResults(): Results {
  const corpus = loadCorpus();
  const hash = corpusHash(corpus);

  let ner: NerPredictions | undefined;
  if (existsSync(NER_FILE)) {
    ner = NerPredictionsSchema.parse(JSON.parse(readFileSync(NER_FILE, 'utf8')));
    if (ner.corpusHash !== hash) {
      throw new Error(
        'evals/pii/ner-predictions.json was recorded for a different corpus. ' +
          'Re-run locally: pnpm eval:pii:ner (downloads the model), then pnpm eval:pii.',
      );
    }
  }

  const splitInfo = (split: Split) => {
    const docs = corpus.documents.filter((d) => d.split === split);
    return {
      seed: corpus.splits[split].seed,
      documents: docs.length,
      goldSpans: docs.reduce((n, d) => n + d.spans.length, 0),
    };
  };

  return ResultsSchema.parse({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    library: { name: '@trusted-ai-lab/pii-cz', version: VERSION, minScore: DEFAULT_MIN_SCORE },
    corpus: {
      hash,
      referenceDate: corpus.referenceDate,
      generatorVersion: corpus.generatorVersion,
      fakerVersion: corpus.fakerVersion,
      splits: { dev: splitInfo('dev'), test: splitInfo('test') },
    },
    ner: ner
      ? {
          model: ner.model,
          detector: ner.detector,
          recordedAt: ner.recordedAt,
          durationMs: ner.durationMs,
        }
      : null,
    configs: {
      rules: runConfig(corpus, undefined),
      ...(ner ? { 'rules+ner': runConfig(corpus, ner) } : {}),
    },
    ...(ner ? { nerOnlyPerson: runNerOnly(corpus, ner) } : {}),
  });
}

const withoutTimestamp = (r: Results) => JSON.stringify({ ...r, generatedAt: undefined });

if (import.meta.main) {
  const results = computeResults();
  if (process.argv.includes('--check')) {
    const committed = ResultsSchema.parse(JSON.parse(readFileSync(RESULTS_FILE, 'utf8')));
    if (withoutTimestamp(committed) !== withoutTimestamp(results)) {
      console.error('evals/pii/results.json is out of date. Run: pnpm eval:pii');
      process.exit(1);
    }
    console.log('evals/pii/results.json is up to date.');
  } else {
    writeFileSync(RESULTS_FILE, `${JSON.stringify(results, null, 2)}\n`);
  }

  for (const [config, reports] of Object.entries(results.configs)) {
    const { micro, leakage } = reports.test;
    console.log(
      `${config.padEnd(10)} test: P ${micro.strict.precision} R ${micro.strict.recall} F1 ${micro.strict.f1}` +
        ` | leaked spans ${leakage.leakedSpans}/${leakage.goldSpans}`,
    );
  }
}
