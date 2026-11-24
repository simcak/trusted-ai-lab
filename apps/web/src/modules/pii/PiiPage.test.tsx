import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { cs } from '../../i18n/cs.ts';
import { RESULTS } from './eval-results.ts';
import { formatPercent } from './format.ts';
import PiiPage from './PiiPage.tsx';

const renderPage = () =>
  render(
    <MemoryRouter>
      <PiiPage />
    </MemoryRouter>,
  );

describe('PiiPage', () => {
  it('detects personal data in the initial sample and pseudonymises the output', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: cs.modules.pii.title })).toBeTruthy();
    const findings = screen.getByTestId('pii-findings');
    expect(within(findings).getByText('791112/5013')).toBeTruthy();
    expect(within(findings).getAllByText('Jan Dvořák')).toHaveLength(2);
    const output = screen.getByTestId('pii-output').textContent ?? '';
    expect(output).toContain('<OSOBA_1>');
    expect(output).not.toContain('791112/5013');
  });

  it('switches to redaction', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText(new RegExp(cs.pii.playground.modes.redact.label)));
    expect(screen.getByTestId('pii-output').textContent).toContain('[RODNÉ_ČÍSLO]');
  });

  it('loads another sample and analyses edited text', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: cs.pii.playground.samples['hard-cases'] }));
    expect(within(screen.getByTestId('pii-findings')).getByText('Petr Nový')).toBeTruthy();

    fireEvent.change(screen.getByLabelText(cs.pii.playground.textareaLabel), {
      target: { value: 'Volejte +420 605 123 456.' },
    });
    expect(
      await within(screen.getByTestId('pii-findings')).findByText('+420 605 123 456'),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: cs.pii.playground.samples['hard-cases'] })
        .getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('shows the reversible round trip with a labelled simulated reply', () => {
    renderPage();
    expect(screen.getByTestId('pii-flow-masked').textContent).not.toContain('Dvořák');
    expect(screen.getByTestId('pii-flow-reply').textContent).toContain('<OSOBA_1>');
    expect(screen.getByTestId('pii-flow-restored').textContent).toContain('Jan Dvořák');
    expect(screen.getByTestId('simulated-badge').textContent).toBe(
      cs.pii.reversible.simulatedBadge,
    );
  });

  it('never puts personal data into the trace', () => {
    renderPage();
    const trace = screen.getByTestId('trace-panel').textContent ?? '';
    expect(trace).not.toMatch(/Dvořák|791112|604 043 590/);
  });

  it('shows eval numbers taken from results.json, with the synthetic-data warning', () => {
    renderPage();
    expect(screen.getByTestId('synthetic-warning').textContent).toBe(cs.pii.eval.warning);
    const table = screen.getByTestId('pii-eval-table');
    const config = RESULTS.configs['rules+ner'] ?? RESULTS.configs.rules;
    const total = within(table).getByRole('row', { name: new RegExp(cs.pii.eval.micro) });
    expect(total.textContent).toContain(formatPercent(config.test.micro.strict.f1));

    fireEvent.click(screen.getByLabelText(cs.pii.eval.configs.rules));
    const rulesTotal = within(screen.getByTestId('pii-eval-table')).getByRole('row', {
      name: new RegExp(cs.pii.eval.micro),
    });
    expect(rulesTotal.textContent).toContain(
      formatPercent(RESULTS.configs.rules.test.micro.strict.f1),
    );
  });
});
