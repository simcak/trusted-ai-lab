import { cs } from '../../../i18n/cs.ts';
import type { CoachInput } from '../activity/summary.ts';

const ZONES = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'] as const;
const decimal = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 });

/**
 * The same summary written by plain rules, without a model. Shown next to the model's answer,
 * and instead of it when the browser cannot run WebGPU. No invented thresholds: it only
 * restates the numbers and which zone dominated.
 */
export function templateExplanation(input: CoachInput): string[] {
  const t = cs.local.template;
  const out = [
    t.overview(
      input.sport,
      input.vzdalenost_km === null ? null : decimal.format(input.vzdalenost_km),
      input.celkovy_cas_min,
      input.cas_v_pohybu_min,
    ),
  ];
  if (input.prumerne_tempo_min_na_km) out.push(t.pace(input.prumerne_tempo_min_na_km));
  if (input.prumerna_rychlost_km_h !== undefined)
    out.push(t.speed(decimal.format(input.prumerna_rychlost_km_h)));
  if (input.stoupani_m) out.push(t.climb(input.stoupani_m));

  if (input.tep) {
    const zones = input.tep.cas_v_zonach_procent;
    const [dominant] = ZONES.map((z, i) => ({ zone: i + 1, percent: zones[z] ?? 0 })).sort(
      (a, b) => b.percent - a.percent,
    );
    if (dominant && dominant.percent > 0) {
      out.push(
        t.dominantZone(dominant.percent, dominant.zone, cs.local.hr.zoneNames[dominant.zone]!),
      );
    }
    const high = (zones.Z4 ?? 0) + (zones.Z5 ?? 0);
    out.push(high > 0 ? t.highIntensity(high) : t.noHighIntensity);
    if (input.trimp !== null) out.push(t.trimp(input.trimp));
    if (input.tep.max_tep_je_odhad) out.push(t.estimated);
  } else {
    out.push(t.noHr);
  }
  if (input.tyden) out.push(t.week(input.tyden.pocet_aktivit, input.tyden.trimp_celkem));
  return out;
}
