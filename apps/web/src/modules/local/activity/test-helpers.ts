import type { TrackPoint } from './types.ts';

export const T0 = Date.parse('2026-11-16T17:30:00Z');

/** One metre-accurate step north at the equator: 0.001° of latitude = 111.195 m. */
export const STEP_M = 111.19492664455873;

/** Builds points every `dtS` seconds; `step(i)` says how many 0.001° steps north point i is. */
export function track(
  count: number,
  dtS: number,
  step: (i: number) => number,
  extra: Partial<TrackPoint> = {},
) {
  return Array.from({ length: count }, (_, i): TrackPoint => ({
    time: T0 + i * dtS * 1000,
    lat: step(i) * 0.001,
    lon: 0,
    ...extra,
  }));
}

/** Heart-rate series: `[hr, intervals]` pairs, one sample every `dtS` seconds, plus a final sample. */
export function hrSeries(parts: [hr: number, intervals: number][], dtS = 10): TrackPoint[] {
  const out: TrackPoint[] = [];
  let i = 0;
  for (const [hr, intervals] of parts) {
    for (let k = 0; k < intervals; k++) out.push({ time: T0 + i++ * dtS * 1000, hr });
  }
  out.push({ time: T0 + i * dtS * 1000, hr: parts.at(-1)![0] });
  return out;
}
