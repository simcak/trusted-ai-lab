import { z } from 'zod';
import type { SAMPLE_CONTENT } from './sample-content.ts';
import manifestJson from '../../../../../data/activities/manifest.json' with { type: 'json' };

/**
 * The sample files live in their own chunk, which the page starts downloading as soon as it opens
 * (`preloadSamples`). Choosing a sample later therefore sends no request and the network panel
 * stays at zero: a request counts by the moment it started.
 */
const SAMPLE_IDS = ['run', 'ride', 'intervals'] as const;
export type SampleId = (typeof SAMPLE_IDS)[number];

const ManifestSchema = z.object({
  athlete: z.object({ maxHr: z.number(), restHr: z.number() }),
  activities: z.array(
    z.object({
      id: z.enum(SAMPLE_IDS),
      file: z.string(),
      format: z.enum(['gpx', 'tcx', 'fit']),
      sport: z.enum(['run', 'ride']),
      startTime: z.string(),
      intervalS: z.number(),
      samples: z.number(),
      durationS: z.number(),
      pathLengthM: z.number(),
      approachM: z.number(),
    }),
  ),
});

const manifest = ManifestSchema.parse(manifestJson);
export type SampleMeta = (typeof manifest.activities)[number];

export const SAMPLES: SampleMeta[] = manifest.activities;

let content: Promise<{ SAMPLE_CONTENT: typeof SAMPLE_CONTENT }> | undefined;

/** Starts (once) the download of the sample files; called when the page opens. */
export function preloadSamples() {
  content ??= import('./sample-content.ts');
  return content;
}

export async function readSample(id: SampleId): Promise<ArrayBuffer> {
  return (await preloadSamples()).SAMPLE_CONTENT[id]();
}

/** Heart-rate parameters the synthetic athlete was simulated with. */
export const SAMPLE_ATHLETE = manifest.athlete;
