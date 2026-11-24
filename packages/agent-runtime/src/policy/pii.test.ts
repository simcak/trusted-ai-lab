import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../scenarios.ts';
import { FUNDS } from '../testing.ts';
import { calculateFees, searchFunds } from '../tools/index.ts';
import { createPiiGuard } from './pii.ts';

const today = new Date('2026-11-24T00:00:00Z');

describe('createPiiGuard', () => {
  it('pseudonymises the name and rodné číslo of scenario 4', () => {
    const guard = createPiiGuard({ today });
    const { value } = guard.protectText(SCENARIOS['s4-rodne-cislo'].userMessage);
    expect(value).toContain('<OSOBA_1>');
    expect(value).toContain('<RODNÉ_ČÍSLO_1>');
    expect(value).not.toContain('Dvořáková');
    expect(value).not.toContain('785215');
    expect(value).toContain('50 000 Kč');
  });

  it('keeps a known value pseudonymous after a round trip through a tool', () => {
    // Detection depends on context words: „pan Novák“ is found, a bare „Novák“ might not be.
    const guard = createPiiGuard({ today });
    expect(guard.protectText('Volal pan Novák.').value).toBe('Volal pan <OSOBA_1>.');

    const toolArgs = guard.revealValue({ body: 'Dobrý den, <OSOBA_1>,' }).value;
    expect(toolArgs.body).toBe('Dobrý den, Novák,');

    expect(guard.protectText(toolArgs.body).value).toBe('Dobrý den, <OSOBA_1>,');
  });

  it('matches known values as whole words only', () => {
    const guard = createPiiGuard({ today });
    guard.protectText('Volal pan Novák.');
    expect(guard.protectText('Nováková').value).not.toContain('<OSOBA_1>ová');
  });

  it('reveals a deep copy and never mutates the input', () => {
    const guard = createPiiGuard({ today });
    guard.protectText('Klientka Jana Dvořáková volala.');
    const args = Object.freeze({ nested: Object.freeze({ to: '<OSOBA_1>' }), n: 5 });
    const { value, restored } = guard.revealValue(args);
    expect(value).toEqual({ nested: { to: 'Jana Dvořáková' }, n: 5 });
    expect(restored).toBe(1);
    expect(args.nested.to).toBe('<OSOBA_1>');
  });

  it('pseudonymises each string of a value separately and leaves fund data alone', () => {
    const guard = createPiiGuard({ today });
    const search = searchFunds(FUNDS, { query: '' });
    const fees = calculateFees(FUNDS[1]!, { fundId: 'beta', amount: 200_000, years: 10 });
    expect(guard.protectValue(search).replacements).toEqual([]);
    expect(guard.protectValue(fees).replacements).toEqual([]);
    // Capitalised category words at the start of a field are not mistaken for surnames.
    expect(
      guard.protectValue({ heading: 'Akciové fondy', text: 'Dluhopisová část' }).replacements,
    ).toEqual([]);
  });
});
