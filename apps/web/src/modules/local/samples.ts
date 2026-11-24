import { z } from 'zod';
import manifestJson from '../../../../../data/activities/manifest.json' with { type: 'json' };
import runGpx from '../../../../../data/activities/vecerni-beh.gpx?raw';
import rideTcx from '../../../../../data/activities/vyjizdka-na-kole.tcx?raw';
import intervalsFit from '../../../../../data/activities/intervaly.fit?inline';

/**
 * The sample files are bundled into this module's chunk (text, and the FIT file as a data URL),
 * so choosing a sample sends no network request and the network panel stays at zero.
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

function textBytes(text: string): () => ArrayBuffer {
  return () => new TextEncoder().encode(text).buffer;
}

function dataUrlBytes(url: string): () => ArrayBuffer {
  return () => {
    const binary = atob(url.slice(url.indexOf(',') + 1));
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out.buffer;
  };
}

const CONTENT: Record<SampleId, () => ArrayBuffer> = {
  run: textBytes(runGpx),
  ride: textBytes(rideTcx),
  intervals: dataUrlBytes(intervalsFit),
};

export interface Sample extends SampleMeta {
  bytes: () => ArrayBuffer;
}

export const SAMPLES: Sample[] = manifest.activities.map((a) => ({ ...a, bytes: CONTENT[a.id] }));

/** Heart-rate parameters the synthetic athlete was simulated with. */
export const SAMPLE_ATHLETE = manifest.athlete;
