import { z } from 'zod';
import { timeInZones, trimp, ZONE_COUNT, type TrimpCoefficient } from './heart-rate.ts';
import {
  distanceMeters,
  elapsedSeconds,
  elevationChange,
  heartRateStats,
  movingSeconds,
} from './metrics.ts';
import type { ParsedActivity, Sport } from './types.ts';

export interface HeartRateSettings {
  maxHr: number;
  /** Entered by the visitor, or estimated as 220 − age. */
  maxHrSource: 'entered' | 'age';
  restHr: number;
  coefficient: TrimpCoefficient;
}

export interface ActivityMetrics {
  sport: Sport;
  elapsedS: number;
  movingS: number | null;
  distanceM: number | null;
  /** Seconds per kilometre, from moving time. */
  paceSPerKm: number | null;
  speedKmH: number | null;
  elevation: { gain: number; loss: number } | null;
  hr: { avg: number; max: number } | null;
  /** Seconds below zone 1 and in zones 1–5. */
  zonesS: number[] | null;
  trimp: number | null;
}

/** Every number on the page comes from here: deterministic code, no model. */
export function computeMetrics(activity: ParsedActivity, hr: HeartRateSettings): ActivityMetrics {
  const { points } = activity;
  const distanceM = distanceMeters(points);
  const movingS = movingSeconds(points);
  const hrStats = heartRateStats(points);
  const hasMovement = distanceM !== null && movingS !== null && distanceM > 0 && movingS > 0;
  return {
    sport: activity.sport,
    elapsedS: elapsedSeconds(points),
    movingS,
    distanceM,
    paceSPerKm: hasMovement ? movingS / (distanceM / 1000) : null,
    speedKmH: hasMovement ? (distanceM / movingS) * 3.6 : null,
    elevation: elevationChange(points),
    hr: hrStats,
    zonesS: hrStats ? timeInZones(points, hr.maxHr) : null,
    trimp: trimp(points, hr),
  };
}

/** 334 s/km → „5:34". */
export function formatPace(secondsPerKm: number): string {
  const total = Math.round(secondsPerKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const SPORT_LABEL: Record<Sport, string> = { run: 'běh', ride: 'kolo', other: 'jiný sport' };
const ZONE_KEYS = ['pod_Z1', 'Z1', 'Z2', 'Z3', 'Z4', 'Z5'] as const;

/**
 * Exactly what the local model gets: aggregates only. No coordinates, no timestamps, no device,
 * no activity name. Czech keys help a small model answer in Czech.
 */
export const CoachInputSchema = z
  .object({
    sport: z.string(),
    vzdalenost_km: z.number().nullable(),
    celkovy_cas_min: z.number(),
    cas_v_pohybu_min: z.number().nullable(),
    prumerne_tempo_min_na_km: z.string().optional(),
    prumerna_rychlost_km_h: z.number().optional(),
    stoupani_m: z.number().nullable(),
    tep: z
      .object({
        prumer: z.number(),
        maximum: z.number(),
        max_tep_sportovce: z.number(),
        max_tep_je_odhad: z.boolean(),
        klidovy_tep: z.number(),
        cas_v_zonach_procent: z.record(z.enum(ZONE_KEYS), z.number()),
      })
      .strict()
      .nullable(),
    trimp: z.number().nullable(),
    tyden: z.object({ pocet_aktivit: z.number(), trimp_celkem: z.number() }).strict().optional(),
  })
  .strict();
export type CoachInput = z.infer<typeof CoachInputSchema>;

const round = (x: number, digits = 0) => Math.round(x * 10 ** digits) / 10 ** digits;
const minutes = (s: number) => Math.round(s / 60);

export function toCoachInput(
  m: ActivityMetrics,
  hr: HeartRateSettings,
  week?: { activities: number; trimpTotal: number },
): CoachInput {
  const zones = m.zonesS;
  const zonesTotal = zones?.reduce((a, b) => a + b, 0) ?? 0;
  return CoachInputSchema.parse({
    sport: SPORT_LABEL[m.sport],
    vzdalenost_km: m.distanceM === null ? null : round(m.distanceM / 1000, 1),
    celkovy_cas_min: minutes(m.elapsedS),
    cas_v_pohybu_min: m.movingS === null ? null : minutes(m.movingS),
    ...(m.paceSPerKm !== null &&
      m.sport !== 'ride' && { prumerne_tempo_min_na_km: formatPace(m.paceSPerKm) }),
    ...(m.speedKmH !== null &&
      m.sport === 'ride' && { prumerna_rychlost_km_h: round(m.speedKmH, 1) }),
    stoupani_m: m.elevation === null ? null : Math.round(m.elevation.gain),
    tep:
      m.hr && zones && zonesTotal > 0
        ? {
            prumer: Math.round(m.hr.avg),
            maximum: Math.round(m.hr.max),
            max_tep_sportovce: hr.maxHr,
            max_tep_je_odhad: hr.maxHrSource === 'age',
            klidovy_tep: hr.restHr,
            cas_v_zonach_procent: Object.fromEntries(
              ZONE_KEYS.slice(0, ZONE_COUNT + 1).map((key, i) => [
                key,
                Math.round((100 * zones[i]!) / zonesTotal),
              ]),
            ),
          }
        : null,
    trimp: m.trimp === null ? null : Math.round(m.trimp),
    ...(week &&
      week.activities > 1 && {
        tyden: { pocet_aktivit: week.activities, trimp_celkem: Math.round(week.trimpTotal) },
      }),
  });
}
