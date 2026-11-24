/**
 * Schemas of the PII eval files. Shared by the eval scripts (which write them) and the web page
 * (which reads results.json and validates it before showing any number).
 */
import { PII_TYPES } from '@trusted-ai-lab/pii-cz';
import { z } from 'zod';

export const PiiTypeSchema = z.enum(PII_TYPES);

const SpanSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  type: PiiTypeSchema,
});

export const SplitSchema = z.enum(['dev', 'test']);
export type Split = z.infer<typeof SplitSchema>;

export const CorpusSchema = z.object({
  schemaVersion: z.literal(1),
  generator: z.string(),
  generatorVersion: z.number().int(),
  fakerVersion: z.string(),
  referenceDate: z.iso.date(),
  splits: z.record(SplitSchema, z.object({ seed: z.number().int(), size: z.number().int() })),
  note: z.string(),
  documents: z.array(
    z.object({
      id: z.string(),
      split: SplitSchema,
      genre: z.string(),
      template: z.string(),
      tags: z.array(z.string()),
      text: z.string(),
      spans: z.array(SpanSchema),
    }),
  ),
});
export type Corpus = z.infer<typeof CorpusSchema>;

export const NerPredictionsSchema = z.object({
  schemaVersion: z.literal(1),
  model: z.object({
    id: z.string(),
    revision: z.string(),
    dtype: z.string(),
    runtime: z.string(),
    runtimeVersion: z.string(),
  }),
  detector: z.object({ minTokenScore: z.number(), weight: z.number() }),
  recordedAt: z.iso.datetime(),
  /** SHA-256 of the corpus documents the predictions were made for. */
  corpusHash: z.string(),
  durationMs: z.number().nonnegative(),
  predictions: z.record(
    z.string(),
    z.array(z.object({ start: z.number().int(), end: z.number().int(), score: z.number() })),
  ),
});
export type NerPredictions = z.infer<typeof NerPredictionsSchema>;

const PrfSchema = z.object({
  precision: z.number().nullable(),
  recall: z.number().nullable(),
  f1: z.number().nullable(),
});

const TypeMetricsSchema = z.object({
  support: z.number().int(),
  predicted: z.number().int(),
  tp: z.number().int(),
  fp: z.number().int(),
  fn: z.number().int(),
  strict: PrfSchema,
  overlap: PrfSchema.extend({ tp: z.number().int() }),
});
export type TypeMetrics = z.infer<typeof TypeMetricsSchema>;

const ReportSchema = z.object({
  documents: z.number().int(),
  perType: z.record(PiiTypeSchema, TypeMetricsSchema),
  micro: TypeMetricsSchema,
  leakage: z.object({
    goldSpans: z.number().int(),
    leakedSpans: z.number().int(),
    partialSpans: z.number().int(),
    spanRate: z.number().nullable(),
    goldChars: z.number().int(),
    leakedChars: z.number().int(),
    charRate: z.number().nullable(),
  }),
  errors: z.array(
    z.object({
      kind: z.enum(['false_negative', 'false_positive']),
      type: PiiTypeSchema,
      note: z.enum(['missed', 'partial', 'wrong_type', 'spurious']),
      otherType: PiiTypeSchema.optional(),
      docId: z.string(),
      span: z.string(),
      context: z.string(),
    }),
  ),
});
export type Report = z.infer<typeof ReportSchema>;

export const ConfigIdSchema = z.enum(['rules', 'rules+ner']);
export type ConfigId = z.infer<typeof ConfigIdSchema>;

export const ResultsSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.iso.datetime(),
  library: z.object({ name: z.string(), version: z.string(), minScore: z.number() }),
  corpus: z.object({
    hash: z.string(),
    referenceDate: z.iso.date(),
    generatorVersion: z.number().int(),
    fakerVersion: z.string(),
    splits: z.record(
      SplitSchema,
      z.object({
        seed: z.number().int(),
        documents: z.number().int(),
        goldSpans: z.number().int(),
      }),
    ),
  }),
  ner: z
    .object({
      model: NerPredictionsSchema.shape.model,
      detector: NerPredictionsSchema.shape.detector,
      recordedAt: z.iso.datetime(),
      durationMs: z.number(),
    })
    .nullable(),
  configs: z.object({
    rules: z.object({ dev: ReportSchema, test: ReportSchema }),
    'rules+ner': z.object({ dev: ReportSchema, test: ReportSchema }).optional(),
  }),
  /** NER predictions alone, PERSON only (present when NER predictions exist). */
  nerOnlyPerson: z.object({ dev: TypeMetricsSchema, test: TypeMetricsSchema }).optional(),
});
export type Results = z.infer<typeof ResultsSchema>;
