import { describe, expect, it } from 'vitest';
import {
  distanceMeters,
  elapsedSeconds,
  elevationChange,
  heartRateStats,
  movingSeconds,
} from './metrics.ts';
import { STEP_M, T0, track } from './test-helpers.ts';

describe('distanceMeters', () => {
  it('sums haversine steps: 10 × 0.001° of latitude = 1 111.95 m', () => {
    expect(distanceMeters(track(11, 10, (i) => i))).toBeCloseTo(10 * STEP_M, 3);
  });

  it('is null without GPS', () => {
    expect(
      distanceMeters([
        { time: T0, hr: 100 },
        { time: T0 + 1000, hr: 101 },
      ]),
    ).toBeNull();
  });
});

describe('movingSeconds', () => {
  it('leaves out a 60 s stop', () => {
    // 5 steps of 111 m every 10 s (11 m/s), 6 intervals standing still, 3 more steps.
    const positions = [0, 1, 2, 3, 4, 5, 5, 5, 5, 5, 5, 5, 6, 7, 8];
    const points = track(positions.length, 10, (i) => positions[i]!);
    expect(elapsedSeconds(points)).toBe(140);
    expect(movingSeconds(points)).toBe(80);
  });

  it('does not count a gap longer than 30 s', () => {
    const points = [
      { time: T0, lat: 0, lon: 0 },
      { time: T0 + 10_000, lat: 0.001, lon: 0 },
      { time: T0 + 70_000, lat: 0.01, lon: 0 },
    ];
    expect(movingSeconds(points)).toBe(10);
  });

  it('counts slow walking but not GPS drift under 0.5 m/s', () => {
    const drift = [
      { time: T0, lat: 0, lon: 0 },
      { time: T0 + 10_000, lat: 0.00004, lon: 0 }, // 4.4 m in 10 s = 0.44 m/s
      { time: T0 + 20_000, lat: 0.0001, lon: 0 }, // 6.7 m in 10 s = 0.67 m/s
    ];
    expect(movingSeconds(drift)).toBe(10);
  });
});

describe('elevationChange', () => {
  const withEle = (values: number[]) => values.map((ele, i) => ({ time: T0 + i * 1000, ele }));

  it('counts climbs and descents that pass the 3 m threshold', () => {
    expect(elevationChange(withEle([100, 110, 105, 120]))).toEqual({ gain: 25, loss: 5 });
  });

  it('ignores noise of a metre or two', () => {
    expect(elevationChange(withEle([100, 101, 99, 100.5, 99.5, 101, 100]))).toEqual({
      gain: 0,
      loss: 0,
    });
  });

  it('adds up a steady climb in threshold steps', () => {
    expect(elevationChange(withEle([100, 101, 102, 103, 104, 105, 106]))).toEqual({
      gain: 6,
      loss: 0,
    });
  });

  it('is null without altitude', () => {
    expect(elevationChange([{ time: T0 }, { time: T0 + 1000 }])).toBeNull();
  });
});

describe('heartRateStats', () => {
  it('weights the average by time', () => {
    const points = [
      { time: T0, hr: 100 },
      { time: T0 + 10_000, hr: 150 },
      { time: T0 + 40_000, hr: 120 },
    ];
    // 10 s at 100 and 30 s at 150 → (1000 + 4500) / 40 = 137.5
    expect(heartRateStats(points)).toEqual({ avg: 137.5, max: 150 });
  });

  it('is null without heart rate', () => {
    expect(heartRateStats(track(3, 10, (i) => i))).toBeNull();
  });
});
