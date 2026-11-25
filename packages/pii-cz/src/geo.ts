/**
 * Location is personal data too: the start and end of a recorded activity are often the
 * athlete's home. These helpers measure distances and trim a "privacy zone" off a GPS track
 * before anything else touches it.
 */

export interface LatLon {
  lat: number;
  lon: number;
}

/** Points may lack a GPS fix (indoor sessions, the first seconds before a fix). */
export type MaybeLatLon = Partial<LatLon>;

/** Mean Earth radius used by the haversine formula, in metres. */
export const EARTH_RADIUS_M = 6_371_000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two WGS84 points in metres (haversine, spherical Earth). */
export function haversineMeters(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function hasLatLon<T extends MaybeLatLon>(p: T): p is T & LatLon {
  return typeof p.lat === 'number' && typeof p.lon === 'number';
}

export interface PrivacyZoneResult<T> {
  /** Points that survive, i.e. `source.slice(keptFrom, keptTo)`. */
  points: T[];
  keptFrom: number;
  keptTo: number;
  trimmedStart: number;
  trimmedEnd: number;
  /** The whole track lies within the zone, nothing is left. */
  allInside: boolean;
}

/**
 * Removes the beginning of the track until it first leaves a circle of `radiusMeters` around
 * its first GPS point, and the end of the track from the last moment it enters the circle
 * around its last GPS point. Everything in the trimmed parts is dropped (also heart rate),
 * so nothing downstream can use it.
 *
 * A track without any GPS point is returned unchanged. A track that never leaves the circle
 * is removed completely (`allInside`). Passes near home in the middle of the track are kept:
 * this is a prefix/suffix trim, not a geofence.
 */
export function applyPrivacyZone<T extends MaybeLatLon>(
  source: readonly T[],
  radiusMeters: number,
): PrivacyZoneResult<T> {
  const n = source.length;
  const keepAll = (): PrivacyZoneResult<T> => ({
    points: [...source],
    keptFrom: 0,
    keptTo: n,
    trimmedStart: 0,
    trimmedEnd: 0,
    allInside: false,
  });
  if (!(radiusMeters > 0)) return keepAll();

  const first = source.find(hasLatLon);
  const last = source.findLast(hasLatLon);
  if (!first || !last) return keepAll();

  let from = -1;
  for (let i = 0; i < n; i++) {
    const p = source[i]!;
    if (hasLatLon(p) && haversineMeters(first, p) >= radiusMeters) {
      from = i;
      break;
    }
  }
  let to = -1;
  for (let i = n - 1; i >= 0; i--) {
    const p = source[i]!;
    if (hasLatLon(p) && haversineMeters(last, p) >= radiusMeters) {
      to = i + 1;
      break;
    }
  }

  if (from < 0 || to < 0 || to <= from) {
    return { points: [], keptFrom: 0, keptTo: 0, trimmedStart: n, trimmedEnd: 0, allInside: true };
  }
  return {
    points: source.slice(from, to),
    keptFrom: from,
    keptTo: to,
    trimmedStart: from,
    trimmedEnd: n - to,
    allInside: false,
  };
}
