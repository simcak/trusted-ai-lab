import { getRule } from '@trusted-ai-lab/intake-rules';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cs } from '../../i18n/cs.ts';
import { QUESTION_ORDER } from './chat/script.ts';
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
const pattern = () => screen.getByTestId('intake-pattern').textContent;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('IntakePage', () => {
  it('opens with the fee calculation played as a chat: no AI needed, outside the AI Act', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: cs.modules.intake.title })).toBeTruthy();
    expect(presetButton('fee-calculation').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(t.presets['fee-calculation'].description)).toBeTruthy();
    expect(pattern()).toBe(t.patterns['no-ai'].label);
    expect(screen.getByTestId('intake-chat-verdict').textContent).toBe(t.patterns['no-ai'].label);
    expect(
      within(screen.getByTestId('intake-ai-act')).getByText(t.aiAct.categories['out-of-scope']),
    ).toBeTruthy();
  });

  it('a credit decision is high-risk and keeps a human in the loop', () => {
    renderPage();
    fireEvent.click(presetButton('credit-decision'));
    expect(pattern()).toBe(`${t.patterns['classic-ml'].label} ${t.withHuman}`);
    const aiAct = within(screen.getByTestId('intake-ai-act'));
    expect(aiAct.getByText(t.aiAct.categories['high-risk'])).toBeTruthy();
    expect(aiAct.getByRole('link', { name: 'AI Act, příloha III bod 5 písm. b)' })).toBeTruthy();
    expect(
      within(screen.getByTestId('intake-controls')).getByText(t.data.controls.fria),
    ).toBeTruthy();
  });

  it('links the controls to the projects that demonstrate them', () => {
    renderPage();
    fireEvent.click(presetButton('client-chatbot'));
    const controls = within(screen.getByTestId('intake-controls'));
    expect(
      controls
        .getByRole('link', { name: `→ ${t.data.moduleLink(cs.modules.pii.title)}` })
        .getAttribute('href'),
    ).toBe('/pii');
    expect(
      controls
        .getByRole('link', { name: `→ ${t.data.moduleLink(cs.modules.agent.title)}` })
        .getAttribute('href'),
    ).toBe('/agent');

    fireEvent.click(presetButton('mail-triage'));
    expect(
      within(screen.getByTestId('intake-controls'))
        .getByRole('link', { name: `→ ${t.data.moduleLink(cs.modules.local.title)}` })
        .getAttribute('href'),
    ).toBe('/local');
  });

  it('a prohibited practice says not to build it and blocks the whole ladder', () => {
    renderPage();
    fireEvent.click(presetButton('emotion-analysis'));
    expect(pattern()).toBe(t.blocked.label);
    expect(
      within(screen.getByTestId('intake-ai-act')).getByText(t.aiAct.categories.prohibited),
    ).toBeTruthy();
    const states = within(screen.getByTestId('intake-ladder')).getAllByText(
      t.ladder.states.blocked,
    );
    expect(states).toHaveLength(6);
  });

  it('the ladder explains why a simpler or a more complex pattern lost', () => {
    renderPage();
    const why = screen.getByRole('button', { name: t.ladder.why(t.ladder.short['classic-ml']) });
    const panel = document.getElementById(why.getAttribute('popovertarget')!);
    expect(panel?.textContent).toContain(getRule('pattern.exact-solution').rationale);
    // Software would work too, but no AI is simpler: needless, not excluded.
    expect(
      within(screen.getByTestId('intake-ladder')).getByText(t.ladder.states.needless),
    ).toBeTruthy();
  });

  it('an own idea: twelve questions answered by clicks, then the recommendation', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.chat.custom) }));
    expect(screen.getByTestId('intake-waiting')).toBeTruthy();
    expect(screen.queryByTestId('intake-result')).toBeNull();
    expect(screen.getByText(new RegExp(t.chat.progress(1, QUESTION_ORDER.length)))).toBeTruthy();

    // Always the first answer offered: calculation with an exact solution → no AI.
    for (const field of QUESTION_ORDER) {
      const tray = screen.getByRole('group', { name: t.chat.questions[field] });
      fireEvent.click(within(tray).getAllByRole('button')[0]!);
    }
    expect(pattern()).toBe(t.patterns['no-ai'].label);
    expect(presetButton('fee-calculation').getAttribute('aria-pressed')).toBe('false');
  });

  it('a click on a fact reopens its question and recomputes, releasing the preset', () => {
    renderPage();
    fireEvent.click(presetButton('policy-summary'));
    expect(pattern()).toBe(t.patterns.rag.label);

    // Same task, but answerable by exact lookup: classic software instead of RAG.
    const short = t.fields.deterministic.short;
    fireEvent.click(
      screen.getByRole('button', {
        name: t.chat.change(short, t.fields.deterministic.options.false),
      }),
    );
    const tray = screen.getByRole('group', { name: t.chat.questions.deterministic });
    fireEvent.click(
      within(tray).getByRole('button', { name: t.fields.deterministic.options.true }),
    );
    expect(pattern()).toBe(t.patterns['classic-software'].label);
    expect(presetButton('policy-summary').getAttribute('aria-pressed')).toBe('false');
  });

  it('shows a cost range per model tier with the assumption next to it', () => {
    renderPage();
    fireEvent.click(presetButton('client-chatbot'));
    const cost = within(screen.getByTestId('intake-cost'));
    expect(cost.getByText(t.cost.tiers.small)).toBeTruthy();
    expect(cost.getByText(t.cost.assumptionShort)).toBeTruthy();
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
    expect(text).toContain(t.presets['advisor-assistant'].description);
    expect(text).toContain(`${t.patterns.agent.label} ${t.withHuman}`);
  });

  it('starting again leaves only the greeting and the sample situations', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.restart) }));
    expect(screen.queryByTestId('intake-result')).toBeNull();
    expect(screen.getByText(t.chat.hello)).toBeTruthy();
    expect(presetButton('fee-calculation').getAttribute('aria-pressed')).toBe('false');
  });
});
