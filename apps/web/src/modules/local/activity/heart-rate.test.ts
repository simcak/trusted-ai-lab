import { describe, expect, it } from 'vitest';
import { estimateMaxHr, heartRateReserve, timeInZones, trimp, zoneOf } from './heart-rate.ts';
import { hrSeries } from './test-helpers.ts';

describe('zoneOf', () => {
  it('uses 50–60–70–80–90 % of maximum heart rate', () => {
    const max = 200;
    expect([99, 100, 119, 120, 139, 140, 160, 180, 210].map((hr) => zoneOf(hr, max))).toEqual([
      0, 1, 1, 2, 2, 3, 4, 5, 5,
    ]);
  });
});

describe('timeInZones', () => {
  it('adds the duration of each interval to the zone of its heart rate', () => {
    // max 200: 110 = 55 % (zone 1), 150 = 75 % (zone 3), 185 = 92.5 % (zone 5)
    const points = hrSeries([
      [110, 6],
      [150, 12],
      [185, 3],
    ]);
    expect(timeInZones(points, 200)).toEqual([0, 60, 0, 120, 0, 30]);
  });
});

describe('trimp (Banister)', () => {
  // Rest 60, max 180, heart rate 120 → HRr = 0.5, for 30 minutes.
  const points = hrSeries([[120, 180]]);

  it('30 min at HRr 0.5 with the male coefficient: 30 × 0.5 × 0.64 × e^0.96 = 25.07', () => {
    expect(trimp(points, { restHr: 60, maxHr: 180, coefficient: 'male' })).toBeCloseTo(25.0723, 3);
  });

  it('with the female coefficient: 30 × 0.5 × 0.86 × e^0.835 = 29.73', () => {
    expect(trimp(points, { restHr: 60, maxHr: 180, coefficient: 'female' })).toBeCloseTo(
      29.7321,
      3,
    );
  });

  it('is null without heart rate', () => {
    expect(
      trimp([{ time: 0 }, { time: 1000 }], { restHr: 60, maxHr: 180, coefficient: 'male' }),
    ).toBeNull();
  });
});

describe('heartRateReserve', () => {
  it('is clamped to 0–1', () => {
    expect(heartRateReserve(50, 60, 180)).toBe(0);
    expect(heartRateReserve(120, 60, 180)).toBe(0.5);
    expect(heartRateReserve(200, 60, 180)).toBe(1);
  });
});

describe('estimateMaxHr', () => {
  it('is 220 − age', () => {
    expect(estimateMaxHr(18)).toBe(202);
  });
});
