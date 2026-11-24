import { describe, expect, it } from 'vitest';
import fundsJson from '../../../../data/funds.json' with { type: 'json' };
import { FundsFileSchema } from '../funds.ts';
import { detectInjection } from '../policy/injection.ts';
import { FUNDS } from '../testing.ts';
import {
  calculateFees,
  createToolbox,
  searchFunds,
  toInputSchema,
  UNAVAILABLE_MESSAGE,
} from './index.ts';
import { CalculateFeesInput } from './schemas.ts';

const fund = (id: string) => FUNDS.find((f) => f.id === id)!;

describe('data/funds.json', () => {
  it('is valid and has eight fictional funds', () => {
    const file = FundsFileSchema.parse(fundsJson);
    expect(file.funds).toHaveLength(8);
    expect(file.note).toMatch(/Fiktivní/);
  });

  it('hides a prompt injection in exactly one description (Fond Théta)', () => {
    const injected = FUNDS.filter((f) => detectInjection(f.description).length > 0);
    expect(injected.map((f) => f.id)).toEqual(['theta']);
  });
});

describe('searchFunds', () => {
  it('returns every fund for an empty query', () => {
    expect(searchFunds(FUNDS, { query: '' }).count).toBe(8);
  });

  it('matches Czech word forms without diacritics', () => {
    const ids = (query: string) => searchFunds(FUNDS, { query }).results.map((f) => f.id);
    expect(ids('dluhopisové fondy')).toEqual(['alfa', 'beta']);
    expect(ids('fondy peněžního trhu')).toEqual(['gama']);
    expect(ids('akciových')).toEqual(['epsilon', 'zeta', 'theta']);
  });

  it('applies category, risk and fee filters', () => {
    const result = searchFunds(FUNDS, {
      query: '',
      filters: { category: 'akciový', maxSri: 5, maxAnnualFeePct: 1 },
    });
    expect(result.results.map((f) => f.id)).toEqual(['theta']);
  });
});

describe('calculateFees', () => {
  it('takes the entry fee first and the annual fee from the remaining value (0 % return)', () => {
    const beta = fund('beta');
    const result = calculateFees(beta, { fundId: 'beta', amount: 50_000, years: 5 });
    const entry = 50_000 * 0.015;
    const annual = (50_000 - entry) * (1 - (1 - 0.009) ** 5);
    expect(result.entryFee).toBe(750);
    expect(result.annualFeesTotal).toBeCloseTo(annual, 2);
    expect(result.totalFees).toBeCloseTo(entry + annual, 2);
    expect(result.totalFeesPct).toBeCloseTo(((entry + annual) / 50_000) * 100, 2);
    expect(result.assumption).toMatch(/0 %/);
  });

  it('charges nothing for a fund without fees', () => {
    const free = { ...fund('gama'), entryFeePct: 0, annualFeePct: 0 };
    expect(calculateFees(free, { fundId: 'gama', amount: 1000, years: 3 }).totalFees).toBe(0);
  });

  it('rejects out-of-range input through its schema', () => {
    expect(CalculateFeesInput.safeParse({ fundId: 'beta', amount: -1, years: 5 }).success).toBe(
      false,
    );
    expect(CalculateFeesInput.safeParse({ fundId: 'beta', amount: 1, years: 99 }).success).toBe(
      false,
    );
    expect(
      CalculateFeesInput.safeParse({ fundId: 'beta', amount: 1, years: 1, extra: true }).success,
    ).toBe(false);
  });
});

describe('createToolbox', () => {
  it('offers JSON Schemas without $schema that forbid extra properties', () => {
    const { definitions } = createToolbox(FUNDS);
    expect(definitions.map((d) => d.name)).toEqual([
      'search_funds',
      'calculate_fees',
      'draft_email',
    ]);
    for (const d of definitions) {
      expect(d.inputSchema).not.toHaveProperty('$schema');
      expect(d.inputSchema).toMatchObject({ type: 'object', additionalProperties: false });
    }
    expect(toInputSchema(CalculateFeesInput)).toMatchObject({
      required: ['fundId', 'amount', 'years'],
    });
  });

  it('never runs a tool on malformed input, guardrails or not', () => {
    const toolbox = createToolbox(FUNDS);
    expect(toolbox.execute('calculate_fees', { fundId: 'beta' })).toMatchObject({ ok: false });
    expect(toolbox.execute('send_money', {})).toMatchObject({ ok: false });
    expect(
      toolbox.execute('calculate_fees', { fundId: 'omega', amount: 1, years: 1 }),
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining('alfa, beta') as unknown,
    });
  });

  it('simulates an outage for the configured tool only', () => {
    const toolbox = createToolbox(FUNDS, { search_funds: 'unavailable' });
    expect(toolbox.execute('search_funds', { query: '' })).toEqual({
      ok: false,
      error: UNAVAILABLE_MESSAGE,
    });
    expect(toolbox.execute('calculate_fees', { fundId: 'beta', amount: 1, years: 1 }).ok).toBe(
      true,
    );
  });

  it('draft_email creates a draft for the UI and tells the model nothing was sent', () => {
    const toolbox = createToolbox(FUNDS);
    const result = toolbox.execute('draft_email', {
      toRole: 'klient',
      subject: 'Poplatky',
      body: 'Dobrý den, posílám srovnání.',
    });
    expect(result).toMatchObject({
      ok: true,
      draft: { id: 'koncept-1', toRole: 'klient', status: 'neodesláno' },
    });
    // The model gets no copy of the body (it could carry re-identified personal data).
    expect(JSON.stringify(result.ok && result.forModel)).not.toContain('posílám');
    expect(JSON.stringify(result.ok && result.forModel)).toContain('Nic nebylo odesláno');
  });
});
