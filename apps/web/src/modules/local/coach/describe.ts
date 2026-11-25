import type { CoachInput } from '../activity/summary.ts';

const decimal = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 });
const ZONES = [
  ['pod_Z1', 'pod zónou 1'],
  ['Z1', 'zóna 1 (velmi lehká)'],
  ['Z2', 'zóna 2 (lehká)'],
  ['Z3', 'zóna 3 (střední)'],
  ['Z4', 'zóna 4 (náročná)'],
  ['Z5', 'zóna 5 (maximální)'],
] as const;

/**
 * The validated aggregates as "name: value unit" lines. A small model in a test repeated raw
 * JSON back and confused units ("195 procent"); labelled lines with units avoid both. Built
 * only from `CoachInput`, so it carries nothing the schema does not allow.
 */
export function describeForModel(input: CoachInput): string {
  const lines = [`Sport: ${input.sport}`];
  if (input.vzdalenost_km !== null)
    lines.push(`Vzdálenost: ${decimal.format(input.vzdalenost_km)} km`);
  lines.push(`Celkový čas: ${input.celkovy_cas_min} min`);
  if (input.cas_v_pohybu_min !== null) lines.push(`Čas v pohybu: ${input.cas_v_pohybu_min} min`);
  if (input.prumerne_tempo_min_na_km)
    lines.push(`Průměrné tempo: ${input.prumerne_tempo_min_na_km} min/km`);
  if (input.prumerna_rychlost_km_h !== undefined) {
    lines.push(`Průměrná rychlost: ${decimal.format(input.prumerna_rychlost_km_h)} km/h`);
  }
  if (input.stoupani_m !== null) lines.push(`Stoupání: ${input.stoupani_m} m`);
  if (input.tep) {
    const t = input.tep;
    lines.push(`Průměrný tep: ${t.prumer} tepů/min`);
    lines.push(`Nejvyšší tep: ${t.maximum} tepů/min`);
    lines.push(
      `Maximální tep sportovce: ${t.max_tep_sportovce} tepů/min (${t.max_tep_je_odhad ? 'jen odhad z věku' : 'zadaný sportovcem'})`,
    );
    lines.push(`Klidový tep: ${t.klidovy_tep} tepů/min`);
    const zones = ZONES.filter(([key]) => (t.cas_v_zonach_procent[key] ?? 0) > 0).map(
      ([key, label]) => `${label} ${t.cas_v_zonach_procent[key]} %`,
    );
    if (zones.length) lines.push(`Čas v tepových zónách: ${zones.join(', ')}`);
  } else {
    lines.push('Tep: soubor ho neobsahuje');
  }
  if (input.trimp !== null) lines.push(`TRIMP (zátěž tréninku): ${input.trimp}`);
  if (input.tyden) {
    lines.push(
      `Tento týden: ${input.tyden.pocet_aktivit} aktivity, TRIMP celkem ${input.tyden.trimp_celkem}`,
    );
  }
  return lines.join('\n');
}
