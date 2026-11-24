import {
  AI_ACT_STATUS,
  estimateCost,
  evaluate,
  PRESETS,
  type IntakeInput,
  type PresetId,
} from '@trusted-ai-lab/intake-rules';
import { describe, expect, it } from 'vitest';
import { cs } from '../../i18n/cs.ts';
import { adrFileName, adrName, cell, toAdrMarkdown } from './adr.ts';
import { formatDay } from './format.ts';
import { PRICING } from './pricing.ts';

const DATE = '2026-11-24';

function adrFor(id: PresetId, description = cs.intake.presets[id].description) {
  const input: IntakeInput = { ...PRESETS[id], description };
  const result = evaluate(input);
  const cost = estimateCost(result.pattern, input.volume, input.latency, PRICING);
  const name = adrName(input.description, cs.intake.presets[id].label);
  return { md: toAdrMarkdown({ name, input, result, cost, pricing: PRICING, date: DATE }), result };
}

describe('toAdrMarkdown', () => {
  it('has the MADR sections in order', () => {
    const { md } = adrFor('credit-decision');
    const a = cs.intake.adr;
    const headings = md.split('\n').filter((l) => l.startsWith('#'));
    expect(headings).toEqual([
      `# ${a.title(cs.intake.presets['credit-decision'].label)}`,
      `## ${a.context}`,
      `## ${a.decision}`,
      `## ${a.alternatives}`,
      `## ${a.consequences}`,
      `### ${a.controls}`,
      `### ${a.aiAct(formatDay(AI_ACT_STATUS.asOf))}`,
      `### ${a.cost}`,
      `## ${a.rules}`,
    ]);
  });

  it('records the decision, the AI Act category with its date, and every fired rule', () => {
    const { md, result } = adrFor('credit-decision');
    expect(md).toContain('Klasické strojové učení + člověk ve smyčce');
    expect(md).toContain(cs.intake.aiAct.categories['high-risk']);
    expect(md).toContain('příloha III bod 5 písm. b)');
    expect(md).toContain(cs.intake.aiAct.appliesFrom('2. 12. 2027', false));
    for (const id of result.fired) expect(md).toContain(`\`${id}\``);
    expect(md).toContain(cs.intake.adr.disclaimer);
  });

  it('cites the price list with source and retrieval date', () => {
    const { md } = adrFor('client-chatbot');
    for (const p of PRICING.providers) {
      expect(md).toContain(`[${p.name}](${p.source})`);
    }
    expect(md).toContain(cs.intake.cost.retrievedAt('24. 11. 2026'));
  });

  it('explains when there is nothing to price', () => {
    expect(adrFor('fee-calculation').md).toContain(cs.intake.cost.noTokens);
    expect(adrFor('mail-triage').md).toContain(cs.intake.cost.notTokenBased);
  });

  it('quotes a multi-line description and keeps tables intact', () => {
    const { md } = adrFor('policy-summary', 'První řádek | s rourou\nDruhý řádek');
    expect(md).toContain('> První řádek | s rourou\n> Druhý řádek');
    const tableRows = md.split('\n').filter((l) => l.startsWith('| '));
    for (const row of tableRows) {
      // Every row of the input table has exactly two cells, of the rules table three.
      const cells = row.replace(/\\\|/g, '').split('|').length - 2;
      expect([2, 3]).toContain(cells);
    }
  });
});

describe('helpers', () => {
  it('cell escapes pipes and flattens newlines', () => {
    expect(cell('a | b\nc')).toBe('a \\| b c');
  });

  it('adrName prefers the preset, then the first line of the description', () => {
    expect(adrName('cokoli', 'Klientský chatbot')).toBe('Klientský chatbot');
    expect(adrName('  Třídění faktur\nvíce textu', null)).toBe('Třídění faktur');
    expect(adrName('   ', null)).toBe(cs.intake.adr.untitled);
    expect(adrName('slovo '.repeat(30), null).length).toBeLessThanOrEqual(81);
  });

  it('adrFileName is ASCII and dated', () => {
    expect(adrFileName('Automatické rozhodnutí o úvěru', DATE)).toBe(
      'adr-automaticke-rozhodnuti-o-uveru-2026-11-24.md',
    );
    expect(adrFileName('???', DATE)).toBe('adr-zamer-2026-11-24.md');
  });
});
