import { forEachHrInterval } from './metrics.ts';
import type { TrackPoint } from './types.ts';

/**
 * Lower bounds of zones 1–5 as a fraction of maximum heart rate (50–60–70–80–90–100 %), the
 * five-zone split used by Edwards' TRIMP and most sport watches.
 */
export const ZONE_LOWER_BOUNDS = [0.5, 0.6, 0.7, 0.8, 0.9] as const;
export const ZONE_COUNT = ZONE_LOWER_BOUNDS.length;

/** 0 = below zone 1, 1–5 = zone. */
export function zoneOf(hr: number, maxHr: number): number {
  const fraction = hr / maxHr;
  let zone = 0;
  for (const [i, bound] of ZONE_LOWER_BOUNDS.entries()) if (fraction >= bound) zone = i + 1;
  return zone;
}

/** Seconds spent below zone 1 (index 0) and in zones 1–5 (indexes 1–5). */
export function timeInZones(points: readonly TrackPoint[], maxHr: number): number[] {
  const out = Array.from({ length: ZONE_COUNT + 1 }, () => 0);
  forEachHrInterval(points, (hr, dt) => {
    out[zoneOf(hr, maxHr)]! += dt;
  });
  return out;
}

/**
 * The well-known "220 − age" (Fox, Naughton & Haskell 1971). A rough population estimate: for
 * one person the real maximum can differ a lot (Robergs & Landwehr 2002).
 */
export function estimateMaxHr(age: number): number {
  return 220 - age;
}

export type TrimpCoefficient = 'male' | 'female';

/** Banister's weighting factor a·e^(b·HRr) (Morton, Fitz-Clarke & Banister 1990). */
export const BANISTER: Record<TrimpCoefficient, { a: number; b: number }> = {
  male: { a: 0.64, b: 1.92 },
  female: { a: 0.86, b: 1.67 },
};

export interface TrimpSettings {
  maxHr: number;
  restHr: number;
  coefficient: TrimpCoefficient;
}

/** Heart-rate reserve fraction, clamped to 0–1. */
export function heartRateReserve(hr: number, restHr: number, maxHr: number): number {
  if (maxHr <= restHr) return 0;
  return Math.min(1, Math.max(0, (hr - restHr) / (maxHr - restHr)));
}

/**
 * Banister TRIMP: Σ duration (min) × HRr × a·e^(b·HRr). One number for "how hard was it",
 * comparable between one person's own sessions.
 */
export function trimp(points: readonly TrackPoint[], settings: TrimpSettings): number | null {
  const { a, b } = BANISTER[settings.coefficient];
  let sum = 0;
  let any = false;
  forEachHrInterval(points, (hr, dt) => {
    const reserve = heartRateReserve(hr, settings.restHr, settings.maxHr);
    sum += (dt / 60) * reserve * a * Math.exp(b * reserve);
    any = true;
  });
  return any ? sum : null;
}
