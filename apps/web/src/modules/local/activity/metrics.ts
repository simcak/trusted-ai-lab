import { hasLatLon, haversineMeters } from '@trusted-ai-lab/pii-cz';
import type { TrackPoint } from './types.ts';

// Design choices, not measurements: they decide what counts as "moving" and as a real climb.
/** Slower than this between two GPS points counts as standing (GPS drift while waiting). */
export const MOVING_MIN_SPEED_MS = 0.5;
/** A longer gap between samples is a pause (auto-pause, lost signal) and is not counted. */
export const MAX_GAP_S = 30;
/** Altitude changes smaller than this are treated as noise. */
export const ELEVATION_HYSTERESIS_M = 3;

const seconds = (a: TrackPoint, b: TrackPoint) => (b.time - a.time) / 1000;

export function elapsedSeconds(points: readonly TrackPoint[]): number {
  if (points.length < 2) return 0;
  return seconds(points[0]!, points.at(-1)!);
}

/** Sum of great-circle distances between consecutive GPS points; null without GPS. */
export function distanceMeters(points: readonly TrackPoint[]): number | null {
  const gps = points.filter(hasLatLon);
  if (gps.length < 2) return null;
  let total = 0;
  for (let i = 1; i < gps.length; i++) total += haversineMeters(gps[i - 1]!, gps[i]!);
  return total;
}

/** Time between consecutive GPS points that moved at least `minSpeed`; null without GPS. */
export function movingSeconds(
  points: readonly TrackPoint[],
  { minSpeed = MOVING_MIN_SPEED_MS, maxGap = MAX_GAP_S } = {},
): number | null {
  const gps = points.filter(hasLatLon);
  if (gps.length < 2) return null;
  let total = 0;
  for (let i = 1; i < gps.length; i++) {
    const a = gps[i - 1]!;
    const b = gps[i]!;
    const dt = seconds(a, b);
    if (dt <= 0 || dt > maxGap) continue;
    if (haversineMeters(a, b) / dt >= minSpeed) total += dt;
  }
  return total;
}

/**
 * Total climb and descent with a hysteresis threshold: the reference altitude moves only once
 * the change reaches `threshold`, so noise of a metre or two adds nothing.
 */
export function elevationChange(
  points: readonly TrackPoint[],
  threshold = ELEVATION_HYSTERESIS_M,
): { gain: number; loss: number } | null {
  const altitudes = points.flatMap((p) => (p.ele === undefined ? [] : [p.ele]));
  if (altitudes.length < 2) return null;
  let ref = altitudes[0]!;
  let gain = 0;
  let loss = 0;
  for (const e of altitudes) {
    if (e - ref >= threshold) {
      gain += e - ref;
      ref = e;
    } else if (ref - e >= threshold) {
      loss += ref - e;
      ref = e;
    }
  }
  return { gain, loss };
}

/**
 * Calls `fn(hr, dt)` for every interval between consecutive samples: the heart rate of the
 * interval's first sample holds for its duration. Gaps longer than `MAX_GAP_S` are skipped.
 */
export function forEachHrInterval(
  points: readonly TrackPoint[],
  fn: (hr: number, dtSeconds: number) => void,
): void {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const dt = seconds(a, points[i]!);
    if (a.hr === undefined || dt <= 0 || dt > MAX_GAP_S) continue;
    fn(a.hr, dt);
  }
}

/** Time-weighted average and maximum heart rate; null when the file has no heart rate. */
export function heartRateStats(points: readonly TrackPoint[]): { avg: number; max: number } | null {
  let weighted = 0;
  let total = 0;
  forEachHrInterval(points, (hr, dt) => {
    weighted += hr * dt;
    total += dt;
  });
  const values = points.flatMap((p) => (p.hr === undefined ? [] : [p.hr]));
  if (total === 0 || values.length === 0) return null;
  return { avg: weighted / total, max: Math.max(...values) };
}
