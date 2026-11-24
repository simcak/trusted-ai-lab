import { describe, expect, it } from 'vitest';
import { simulatedReply } from './simulated-reply.ts';

describe('simulatedReply', () => {
  it('uses only placeholders, one sentence per type', () => {
    const reply = simulatedReply([
      { placeholder: '<OSOBA_1>', type: 'PERSON', original: 'Jan Dvořák' },
      { placeholder: '<RODNÉ_ČÍSLO_1>', type: 'RODNE_CISLO', original: '791112/5013' },
      { placeholder: '<TELEFON_1>', type: 'PHONE', original: '+420 604 043 590' },
    ]);
    expect(reply).toContain('Dobrý den, <OSOBA_1>,');
    expect(reply).toContain('<RODNÉ_ČÍSLO_1>');
    expect(reply).toContain('<TELEFON_1>');
    expect(reply).not.toMatch(/Dvořák|791112|604/);
  });

  it('greets generically without a person', () => {
    expect(simulatedReply([]).startsWith('Dobrý den,\n')).toBe(true);
  });
});
