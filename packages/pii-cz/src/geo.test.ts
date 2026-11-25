import { describe, expect, it } from 'vitest';
import { applyPrivacyZone, haversineMeters, type MaybeLatLon } from './geo.ts';

describe('haversineMeters', () => {
  it('measures 0.01° of latitude as R·Δφ', () => {
    // 6 371 000 m × 0.01° × π / 180 = 1 111.949 m
    expect(haversineMeters({ lat: 0, lon: 0 }, { lat: 0.01, lon: 0 })).toBeCloseTo(1111.949, 3);
  });

  it('halves a longitude step at 60° latitude (cos 60° = 0.5)', () => {
    expect(haversineMeters({ lat: 60, lon: 0 }, { lat: 60, lon: 0.01 })).toBeCloseTo(555.975, 2);
  });

  it('is zero for the same point and symmetric', () => {
    const a = { lat: 49.2, lon: 16.6 };
    const b = { lat: 49.21, lon: 16.62 };
    expect(haversineMeters(a, a)).toBe(0);
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 9);
  });
});

/** A straight track heading north, one point every 0.001° (≈ 111.19 m). */
const straight = (count: number): (MaybeLatLon & { i: number })[] =>
  Array.from({ length: count }, (_, i) => ({ i, lat: 50 + i * 0.001, lon: 14 }));

describe('applyPrivacyZone', () => {
  it('trims both ends to the first point at least R away', () => {
    // Index 4 is 444.8 m from the start, index 3 only 333.6 m.
    const result = applyPrivacyZone(straight(20), 400);
    expect(result.trimmedStart).toBe(4);
    expect(result.trimmedEnd).toBe(4);
    expect(result.points.map((p) => p.i)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(result.allInside).toBe(false);
  });

  it('keeps everything with radius 0', () => {
    const result = applyPrivacyZone(straight(5), 0);
    expect(result.points).toHaveLength(5);
    expect(result.trimmedStart + result.trimmedEnd).toBe(0);
  });

  it('removes a track that never leaves the zone', () => {
    const result = applyPrivacyZone(straight(3), 400);
    expect(result.allInside).toBe(true);
    expect(result.points).toEqual([]);
  });

  it('leaves a track without GPS untouched', () => {
    const indoor: (MaybeLatLon & { hr: number })[] = [{ hr: 120 }, { hr: 130 }, { hr: 125 }];
    const result = applyPrivacyZone(indoor, 400);
    expect(result.points).toEqual(indoor);
    expect(result.allInside).toBe(false);
  });

  it('drops points without a fix inside the trimmed prefix', () => {
    const track: MaybeLatLon[] = [{}, ...straight(10), {}];
    const result = applyPrivacyZone(track, 400);
    expect(result.keptFrom).toBe(5); // the gap point plus indexes 0–3 of the straight part
    expect(result.trimmedEnd).toBe(5); // indexes 6–9 and the trailing gap point
  });

  it('trims a loop that starts and ends at the same place', () => {
    // Out 10 points north, back 10 points south: start and end are both at index 0.
    const out = straight(11);
    const loop = [...out, ...out.slice(0, -1).reverse()];
    const result = applyPrivacyZone(loop, 400);
    expect(result.points[0]?.i).toBe(4);
    expect(result.points.at(-1)?.i).toBe(4);
  });
});
