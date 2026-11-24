import runGpx from '../../../../../data/activities/vecerni-beh.gpx?raw';
import rideTcx from '../../../../../data/activities/vyjizdka-na-kole.tcx?raw';
import intervalsFit from '../../../../../data/activities/intervaly.fit?inline';
import type { SampleId } from './samples.ts';

/** The sample files themselves (≈ 50 kB gzip): GPX and TCX as text, FIT as a data URL. */
function textBytes(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

function dataUrlBytes(url: string): ArrayBuffer {
  const binary = atob(url.slice(url.indexOf(',') + 1));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out.buffer;
}

export const SAMPLE_CONTENT: Record<SampleId, () => ArrayBuffer> = {
  run: () => textBytes(runGpx),
  ride: () => textBytes(rideTcx),
  intervals: () => dataUrlBytes(intervalsFit),
};
