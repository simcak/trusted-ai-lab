import { describe, expect, it } from 'vitest';
import type { CoachInput } from '../activity/summary.ts';
import { buildCoachRequest, COACH_SYSTEM_PROMPT } from './prompt.ts';
import { templateExplanation } from './template.ts';

const run: CoachInput = {
  sport: 'běh',
  vzdalenost_km: 5.4,
  celkovy_cas_min: 31,
  cas_v_pohybu_min: 30,
  prumerne_tempo_min_na_km: '5:36',
  stoupani_m: 48,
  tep: {
    prumer: 143,
    maximum: 161,
    max_tep_sportovce: 195,
    max_tep_je_odhad: true,
    klidovy_tep: 55,
    cas_v_zonach_procent: { pod_Z1: 0, Z1: 0, Z2: 24, Z3: 66, Z4: 10, Z5: 0 },
  },
  trimp: 43,
  tyden: { pocet_aktivit: 3, trimp_celkem: 172 },
};

describe('templateExplanation', () => {
  it('restates the numbers and names the dominant zone', () => {
    expect(templateExplanation(run)).toEqual([
      'Trénink (běh): 5,4 km za 31 min, z toho 30 min v pohybu.',
      'Průměrné tempo 5:36 min/km.',
      'Stoupání celkem 48 m.',
      'Nejvíc času (66 %) bylo srdce v zóně 3, tedy střední intenzita.',
      'Ve vysoké intenzitě (zóny 4 a 5) uběhlo 10 % času.',
      'TRIMP vyšel 43. Srovnávejte ho hlavně se svými dalšími tréninky.',
      'Maximální tep je odhad z věku, zóny proto berte orientačně.',
      'Za týden: 3 aktivity, TRIMP celkem 172.',
    ]);
  });

  it('says so when the file has no heart rate', () => {
    const lines = templateExplanation({ ...run, tep: null, trimp: null, tyden: undefined });
    expect(lines.at(-1)).toBe('Bez tepu nejde říct, jak náročný trénink byl.');
  });
});

describe('buildCoachRequest', () => {
  it('sends the summary and the question, nothing else', () => {
    const req = buildCoachRequest(run, 'Na co se příště zaměřit?');
    expect(req.system).toBe(COACH_SYSTEM_PROMPT);
    expect(req.messages).toHaveLength(1);
    const content = req.messages[0]!.role === 'user' ? req.messages[0]!.content : '';
    expect(content).toContain('"vzdalenost_km": 5.4');
    expect(content).toContain('Otázka sportovce: Na co se příště zaměřit?');
    expect(req.maxTokens).toBe(300);
  });
});
