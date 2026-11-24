import { z } from 'zod';
import { LlmResponseSchema } from './types.ts';

/** A recorded response keeps the serving `model`; `provider` is set at replay time. */
export const RecordedResponseSchema = LlmResponseSchema.omit({
  provider: true,
  providerState: true,
});

/** One recorded model call. */
export const RecordedStepSchema = z.object({
  step: z.number().int().nonnegative(),
  /** `hashRequest()` of the request that produced the response. */
  requestHash: z.string().regex(/^[0-9a-f]{64}$/),
  response: RecordedResponseSchema,
});
export type RecordedStep = z.infer<typeof RecordedStepSchema>;

export const RecordingSchema = z
  .object({
    schemaVersion: z.literal(2),
    /**
     * `recorded` = real model output captured by a recording script.
     * `fixture` = hand-written test data; the UI must label it and never present it as model output.
     */
    kind: z.enum(['recorded', 'fixture']),
    scenario: z.string().min(1),
    /** Exact model id requested for the recording (or `fixture`). Each step names the serving model. */
    model: z.string().min(1),
    recordedAt: z.iso.datetime(),
    promptVersion: z.string().min(1),
    note: z.string().optional(),
    /** May be empty when a policy answered without calling the model; the UI must say so. */
    steps: z.array(RecordedStepSchema),
  })
  // zod 4 keeps this refinement through `.extend()` with new keys (used by agent-runtime).
  .refine((rec) => new Set(rec.steps.map((s) => s.step)).size === rec.steps.length, {
    message: 'Step numbers must be unique within a recording',
    path: ['steps'],
  });
export type Recording = z.infer<typeof RecordingSchema>;

/** Validates untrusted JSON (e.g. a fetched or imported file) into recordings; throws on invalid data. */
export function parseRecordings(data: unknown): Recording[] {
  return z.array(RecordingSchema).parse(data);
}
