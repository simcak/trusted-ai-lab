import { describe, expect, it } from 'vitest';
import { acwr, dayKey, weekLoad } from './load.ts';

const at = (day: string, trimp: number) => ({ start: Date.parse(`${day}T09:00:00Z`), trimp });

describe('weekLoad', () => {
  it('lists the 7 days ending with the latest activity', () => {
    const week = weekLoad(
      [at('2026-11-16', 100), at('2026-11-18', 80), at('2026-11-21', 120)],
      'UTC',
    );
    expect(week.map((d) => d.day)).toEqual([
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
    ]);
    expect(week.map((d) => d.trimp)).toEqual([0, 100, 0, 80, 0, 0, 120]);
  });

  it('adds activities of the same day', () => {
    expect(weekLoad([at('2026-11-16', 30), at('2026-11-16', 20)], 'UTC').at(-1)?.trimp).toBe(50);
  });

  it('uses the local calendar day', () => {
    // 23:30 UTC is already the next day in Prague (UTC+1 in November).
    expect(dayKey(Date.parse('2026-11-16T23:30:00Z'), 'Europe/Prague')).toBe('2026-11-17');
  });
});

describe('acwr', () => {
  it('needs 28 days of data', () => {
    expect(acwr([at('2026-11-16', 100), at('2026-11-21', 120)], 'UTC')).toEqual({
      status: 'insufficient',
      spanDays: 6,
    });
  });

  it('divides the last 7 days by the weekly average of the last 28 days', () => {
    // 200 + 200 + 200 in the older weeks, 300 in the last one: 300 / (900 / 4) = 1.333
    const result = acwr(
      [at('2026-10-25', 200), at('2026-11-01', 200), at('2026-11-08', 200), at('2026-11-21', 300)],
      'UTC',
    );
    expect(result).toMatchObject({ status: 'ok', acute: 300, chronic: 225 });
    expect(result.status === 'ok' && result.ratio).toBeCloseTo(1.3333, 4);
  });
});
