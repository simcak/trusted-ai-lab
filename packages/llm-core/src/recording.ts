import { z } from 'zod';
import { LlmResponseSchema } from './types.ts';

/** One recorded model response; `model` and `provider` live on the recording / are set at replay time. */
export const RecordedStepSchema = z.object({
  step: z.number().int().nonnegative(),
  response: LlmResponseSchema.omit({ model: true, provider: true }),
});
export type RecordedStep = z.infer<typeof RecordedStepSchema>;

export const RecordingSchema = z
  .object({
    schemaVersion: z.literal(1),
    /**
     * `recorded` = real model output captured by a recording script.
     * `fixture` = hand-written test data; the UI must label it and never present it as model output.
     */
    kind: z.enum(['recorded', 'fixture']),
    scenario: z.string().min(1),
    /** Exact model id used for the recording (or `fixture`). */
    model: z.string().min(1),
    recordedAt: z.iso.datetime(),
    promptVersion: z.string().min(1),
    note: z.string().optional(),
    steps: z.array(RecordedStepSchema).min(1),
  })
  .refine((rec) => new Set(rec.steps.map((s) => s.step)).size === rec.steps.length, {
    message: 'Step numbers must be unique within a recording',
    path: ['steps'],
  });
export type Recording = z.infer<typeof RecordingSchema>;

/** Validates untrusted JSON (e.g. a fetched or imported file) into recordings; throws on invalid data. */
export function parseRecordings(data: unknown): Recording[] {
  return z.array(RecordingSchema).parse(data);
}
