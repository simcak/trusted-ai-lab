import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { cs } from '../../i18n/cs.ts';
import { RESULTS } from './eval-results.ts';
import { formatPercent } from './format.ts';
import PiiPage from './PiiPage.tsx';

const t = cs.pii.machine;

const renderPage = () =>
  render(
    <MemoryRouter>
      <PiiPage />
    </MemoryRouter>,
  );

describe('PiiPage', () => {
  it('lights up personal data in the first sample and shows what the AI would get', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: cs.modules.pii.title })).toBeTruthy();
    const highlighted = screen.getByTestId('pii-highlighted');
    expect(within(highlighted).getByText('791112/5013')).toBeTruthy();
    expect(within(highlighted).getAllByText('Jan Dvořák')).toHaveLength(2);
    const output = screen.getByTestId('pii-output').textContent ?? '';
    expect(output).toContain('<OSOBA_1>');
    expect(output).not.toContain('791112/5013');
  });

  it('explains every finding behind its type label', () => {
    renderPage();
    const label = screen.getAllByRole('button', { name: t.why(cs.pii.types.RODNE_CISLO) })[0]!;
    const panel = document.getElementById(label.getAttribute('popovertarget')!);
    expect(panel?.textContent).toContain(t.reasons);
    expect(panel?.textContent).toContain(cs.pii.reasons.checksum_mod11);
  });

  it('switches to redaction and drops the reply step', () => {
    renderPage();
    expect(screen.getByTestId('pii-flow-restored')).toBeTruthy();
    fireEvent.click(screen.getByLabelText(new RegExp(t.modes.redact.label)));
    expect(screen.getByTestId('pii-output').textContent).toContain('[RODNÉ_ČÍSLO]');
    expect(screen.queryByTestId('pii-flow-restored')).toBeNull();
  });

  it('loads another sample and analyses an own text', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: t.samples['hard-cases'] }));
    expect(within(screen.getByTestId('pii-highlighted')).getByText('Petr Nový')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.custom) }));
    expect(
      screen.getByRole('button', { name: t.samples['hard-cases'] }).getAttribute('aria-pressed'),
    ).toBe('false');
    fireEvent.change(screen.getByLabelText(t.textareaLabel), {
      target: { value: 'Volejte +420 605 123 456.' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.done }));
    expect(
      await within(screen.getByTestId('pii-highlighted')).findByText('+420 605 123 456'),
    ).toBeTruthy();
  });

  it('brings the values back in the reply, which is labelled as simulated', () => {
    renderPage();
    expect(screen.getByTestId('pii-output').textContent).not.toContain('Dvořák');
    const restored = screen.getByTestId('pii-flow-restored').textContent ?? '';
    expect(restored).toContain('Jan Dvořák');
    expect(restored).toContain('<OSOBA_1>');
    expect(screen.getByTestId('simulated-badge').textContent).toBe(
      cs.pii.reversible.simulatedBadge,
    );
  });

  it('keeps the details under the hood: all findings, the map and a trace without personal data', () => {
    renderPage();
    const findings = screen.getByTestId('pii-findings');
    expect(within(findings).getByText('791112/5013')).toBeTruthy();
    const trace = screen.getByTestId('trace-panel').textContent ?? '';
    expect(trace).not.toMatch(/Dvořák|791112|604 043 590/);
  });

  it('shows eval numbers taken from results.json, with the synthetic-data warning', () => {
    renderPage();
    // The numbers sit in a closed drawer section, hence `hidden: true` for role queries.
    expect(screen.getByTestId('synthetic-warning').textContent).toBe(cs.pii.eval.warning);
    const table = screen.getByTestId('pii-eval-table');
    const config = RESULTS.configs['rules+ner'] ?? RESULTS.configs.rules;
    const total = within(table).getByRole('row', {
      name: new RegExp(cs.pii.eval.micro),
      hidden: true,
    });
    expect(total.textContent).toContain(formatPercent(config.test.micro.strict.f1));

    fireEvent.click(screen.getByLabelText(cs.pii.eval.configs.rules));
    const rulesTotal = within(screen.getByTestId('pii-eval-table')).getByRole('row', {
      name: new RegExp(cs.pii.eval.micro),
      hidden: true,
    });
    expect(rulesTotal.textContent).toContain(
      formatPercent(RESULTS.configs.rules.test.micro.strict.f1),
    );
  });
});
