import type { TrimpCoefficient } from './activity/heart-rate.ts';
import { estimateMaxHr } from './activity/heart-rate.ts';
import type { HeartRateSettings } from './activity/summary.ts';

export interface HeartRateForm {
  maxHr: number;
  useAge: boolean;
  age: number;
  restHr: number;
  coefficient: TrimpCoefficient;
}

export const clamp = (x: number, lo: number, hi: number) =>
  Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo;

export function toHeartRateSettings(f: HeartRateForm): HeartRateSettings {
  const maxHr = f.useAge ? estimateMaxHr(clamp(f.age, 10, 100)) : clamp(f.maxHr, 120, 240);
  return {
    maxHr,
    maxHrSource: f.useAge ? 'age' : 'entered',
    restHr: Math.min(clamp(f.restHr, 30, 120), maxHr - 1),
    coefficient: f.coefficient,
  };
}
