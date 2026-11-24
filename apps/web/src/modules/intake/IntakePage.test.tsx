import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cs } from '../../i18n/cs.ts';
import IntakePage from './IntakePage.tsx';

const t = cs.intake;

const renderPage = () =>
  render(
    <MemoryRouter>
      <IntakePage />
    </MemoryRouter>,
  );

const presetButton = (id: keyof typeof t.presets) =>
  screen.getByRole('button', { name: t.presets[id].label });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('IntakePage', () => {
  it('opens with the fee calculation: no AI needed, outside the AI Act', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: cs.modules.intake.title })).toBeTruthy();
    expect(presetButton('fee-calculation').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('intake-pattern').textContent).toBe(t.patterns['no-ai'].label);
    expect(
      within(screen.getByTestId('intake-ai-act')).getByText(t.aiAct.categories['out-of-scope']),
    ).toBeTruthy();
  });

  it('a credit decision is high-risk and keeps a human in the loop', () => {
    renderPage();
    fireEvent.click(presetButton('credit-decision'));
    expect(screen.getByTestId('intake-pattern').textContent).toBe(
      `${t.patterns['classic-ml'].label} ${t.withHuman}`,
    );
    const aiAct = within(screen.getByTestId('intake-ai-act'));
    expect(aiAct.getByText(t.aiAct.categories['high-risk'])).toBeTruthy();
    expect(aiAct.getByRole('link', { name: 'AI Act, příloha III bod 5 písm. b)' })).toBeTruthy();
    expect(
      within(screen.getByTestId('intake-controls')).getByText(t.data.controls.fria),
    ).toBeTruthy();
  });

  it('links the controls to the modules that demonstrate them', () => {
    renderPage();
    fireEvent.click(presetButton('client-chatbot'));
    const controls = within(screen.getByTestId('intake-controls'));
    expect(
      controls
        .getByRole('link', { name: `→ ${t.data.moduleLink(2, cs.modules.pii.title)}` })
        .getAttribute('href'),
    ).toBe('/pii');
    expect(
      controls
        .getByRole('link', { name: `→ ${t.data.moduleLink(3, cs.modules.agent.title)}` })
        .getAttribute('href'),
    ).toBe('/agent');

    fireEvent.click(presetButton('mail-triage'));
    expect(
      within(screen.getByTestId('intake-controls'))
        .getByRole('link', { name: `→ ${t.data.moduleLink(4, cs.modules.local.title)}` })
        .getAttribute('href'),
    ).toBe('/local');
  });

  it('a prohibited practice says not to build it', () => {
    renderPage();
    fireEvent.click(presetButton('emotion-analysis'));
    expect(screen.getByTestId('intake-pattern').textContent).toBe(t.blocked.label);
    expect(
      within(screen.getByTestId('intake-ai-act')).getByText(t.aiAct.categories.prohibited),
    ).toBeTruthy();
  });

  it('recomputes on every change and releases the preset', () => {
    renderPage();
    fireEvent.click(presetButton('policy-summary'));
    expect(screen.getByTestId('intake-pattern').textContent).toBe(t.patterns.rag.label);

    // Same task, but answerable by exact lookup: classic software instead of RAG.
    const exact = within(
      screen.getByRole('group', { name: t.fields.deterministic.legend }),
    ).getByLabelText(t.fields.deterministic.options.true);
    fireEvent.click(exact);
    expect(screen.getByTestId('intake-pattern').textContent).toBe(
      t.patterns['classic-software'].label,
    );
    expect(presetButton('policy-summary').getAttribute('aria-pressed')).toBe('false');
  });

  it('shows a cost range per model tier with the assumption next to it', () => {
    renderPage();
    fireEvent.click(presetButton('client-chatbot'));
    const cost = within(screen.getByTestId('intake-cost'));
    expect(cost.getByText(t.cost.tiers.small)).toBeTruthy();
    expect(cost.getByText(/Předpoklad dema, ne měření/)).toBeTruthy();
  });

  it('downloads the ADR as Markdown', async () => {
    let blob: Blob | undefined;
    const createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return 'blob:adr';
    });
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderPage();
    fireEvent.click(presetButton('advisor-assistant'));
    fireEvent.click(screen.getByRole('button', { name: t.adr.button }));

    expect(click).toHaveBeenCalledOnce();
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toMatch(/^adr-asistent-poradce-\d{4}-\d{2}-\d{2}\.md$/);
    expect(blob?.type).toBe('text/markdown;charset=utf-8');
    const text = await blob?.text();
    expect(text).toMatch(/^# ADR: Asistent poradce\n/);
    expect(text).toContain(`${t.patterns.agent.label} ${t.withHuman}`);
  });
});
