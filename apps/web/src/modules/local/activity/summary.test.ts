import { describe, expect, it } from 'vitest';
import { SAMPLES } from '../samples.ts';
import { parseActivityFile } from './parse.ts';
import { protect } from './privacy.ts';
import {
  CoachInputSchema,
  computeMetrics,
  formatPace,
  toCoachInput,
  type HeartRateSettings,
} from './summary.ts';
import { STEP_M, track } from './test-helpers.ts';

const settings: HeartRateSettings = {
  maxHr: 200,
  maxHrSource: 'entered',
  restHr: 60,
  coefficient: 'male',
};

describe('formatPace', () => {
  it('formats seconds per km as m:ss', () => {
    expect(formatPace(334)).toBe('5:34');
    expect(formatPace(359.6)).toBe('6:00');
  });
});

describe('computeMetrics + toCoachInput', () => {
  // 1 111.95 m in 300 s at heart rate 140 (70 % → zone 3).
  const points = track(31, 10, (i) => i / 3, { hr: 140, ele: 200 });

  it('derives pace from moving time and distance', () => {
    const m = computeMetrics(
      { format: 'gpx', sport: 'run', name: undefined, points, droppedMetadata: [] },
      settings,
    );
    expect(m.distanceM).toBeCloseTo(10 * STEP_M, 3);
    expect(m.movingS).toBe(300);
    expect(m.paceSPerKm).toBeCloseTo(300 / ((10 * STEP_M) / 1000), 6);
    expect(m.zonesS).toEqual([0, 0, 0, 300, 0, 0]);
  });

  it('builds the model input from aggregates only', () => {
    const m = computeMetrics(
      { format: 'gpx', sport: 'run', name: 'Běh s Janem', points, droppedMetadata: ['author'] },
      settings,
    );
    const input = toCoachInput(m, settings);
    expect(input).toEqual({
      sport: 'běh',
      vzdalenost_km: 1.1,
      celkovy_cas_min: 5,
      cas_v_pohybu_min: 5,
      prumerne_tempo_min_na_km: '4:30',
      stoupani_m: 0,
      tep: {
        prumer: 140,
        maximum: 140,
        max_tep_sportovce: 200,
        max_tep_je_odhad: false,
        klidovy_tep: 60,
        cas_v_zonach_procent: { pod_Z1: 0, Z1: 0, Z2: 0, Z3: 100, Z4: 0, Z5: 0 },
      },
      trimp: expect.any(Number) as number,
    });
  });

  it('rejects anything the schema does not list', () => {
    expect(() => CoachInputSchema.parse({ ...toCoachInputFor(), lat: 50 })).toThrow();
  });
});

function toCoachInputFor() {
  const points = track(4, 10, (i) => i, { hr: 120 });
  return toCoachInput(
    computeMetrics(
      { format: 'gpx', sport: 'ride', name: undefined, points, droppedMetadata: [] },
      settings,
    ),
    settings,
  );
}

describe.each(SAMPLES.map((s) => s.id))('model input for sample %s', (id) => {
  it('contains no coordinates, times, names or device data', async () => {
    const sample = SAMPLES.find((s) => s.id === id)!;
    const activity = protect(await parseActivityFile(sample.bytes()), 400).activity;
    const json = JSON.stringify(toCoachInput(computeMetrics(activity, settings), settings));
    expect(json).not.toMatch(/49\.2|16\.6/); // the fictional home is at 49.2078, 16.6086
    expect(json).not.toMatch(/2026|T\d\d:/);
    expect(json).not.toMatch(/Ukázkov|hodinky|3141592653/);
    expect(json.length).toBeLessThan(500);
  });
});
