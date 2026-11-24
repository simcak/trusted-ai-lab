import { applyPrivacyZone } from '@trusted-ai-lab/pii-cz';
import type { ParsedActivity, TrackPoint } from './types.ts';

/** CLAUDE.md, module 4: the start of an activity is often the athlete's home. */
export const DEFAULT_PRIVACY_RADIUS_M = 400;
export const MAX_PRIVACY_RADIUS_M = 1000;

export interface ProtectedActivity {
  /** The activity with only the kept points. Everything downstream works with this. */
  activity: ParsedActivity;
  /** The trimmed parts, kept only to draw them faded on the local map. */
  removed: { start: TrackPoint[]; end: TrackPoint[] };
  allInside: boolean;
  radiusM: number;
}

/** Runs first, before any metric or summary is computed. */
export function protect(activity: ParsedActivity, radiusM: number): ProtectedActivity {
  const zone = applyPrivacyZone(activity.points, radiusM);
  return {
    activity: { ...activity, points: zone.points },
    removed: {
      start: activity.points.slice(0, zone.trimmedStart),
      end: zone.allInside ? [] : activity.points.slice(zone.keptTo),
    },
    allInside: zone.allInside,
    radiusM,
  };
}
