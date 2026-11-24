import {
  AGENT_MODEL,
  AgentRecordingSchema,
  SCENARIOS,
  createRecorder,
  runAgent,
  runKey,
  type AgentRecording,
} from '@trusted-ai-lab/agent-runtime';
import { createTraceLog, type LlmProvider, type LlmResponse } from '@trusted-ai-lab/llm-core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cs } from '../../i18n/cs.ts';
import AgentPage from './AgentPage.tsx';
import { FUNDS } from './funds.ts';

const mocks = vi.hoisted(() => ({
  recording: undefined as AgentRecording | undefined,
  provider: undefined as LlmProvider | undefined,
  keys: [] as string[],
}));

vi.mock('./recordings.ts', () => ({
  getRecording: (id: string, guardrails: boolean) =>
    mocks.recording?.scenario === `${id}/${guardrails ? 'on' : 'off'}`
      ? mocks.recording
      : undefined,
}));

vi.mock('./byok.ts', () => ({
  createByokProvider: (key: string) => {
    mocks.keys.push(key);
    return Promise.resolve(mocks.provider);
  },
}));

type Turn = Pick<LlmResponse, 'content' | 'toolCalls'>;

/** Hand-written model turns — test fixtures, not model output. */
function scripted(turns: Turn[]): LlmProvider {
  let i = 0;
  return {
    id: 'byok-anthropic',
    complete: () => {
      const turn = turns[i++];
      if (!turn) return Promise.reject(new Error('script exhausted'));
      return Promise.resolve({
        ...turn,
        stopReason: turn.toolCalls.length ? 'tool_use' : 'stop',
        usage: { inputTokens: 100, outputTokens: 10 },
        latencyMs: 5,
        model: 'fixture',
        provider: 'byok-anthropic',
      });
    },
  };
}

const s2Turns: Turn[] = [
  {
    content: '',
    toolCalls: [
      { id: 'a', name: 'search_funds', arguments: { query: '', filters: { category: 'akciový' } } },
    ],
  },
  {
    content: '',
    toolCalls: [
      {
        id: 'b',
        name: 'draft_email',
        arguments: {
          toRole: 'klient',
          subject: 'Srovnání poplatků',
          body: 'Dobrý den, <OSOBA_1>.',
        },
      },
    ],
  },
  { content: 'Koncept je připravený ke kontrole.', toolCalls: [] },
];

/** A fixture made the way the recording script makes real recordings. */
async function fixtureRecording(): Promise<AgentRecording> {
  const s = SCENARIOS['s2-injekce'];
  const recorder = createRecorder(scripted(s2Turns));
  const recordedAt = '2026-11-24T12:00:00.000Z';
  await runAgent({
    provider: recorder.provider,
    log: createTraceLog(),
    funds: FUNDS,
    persona: s.persona,
    guardrails: true,
    userMessage: s.userMessage,
    scenario: runKey(s.id, true),
    today: new Date(recordedAt),
    approve: () => Promise.resolve({ decision: 'approved', decidedBy: 'author' }),
  });
  return AgentRecordingSchema.parse({
    schemaVersion: 2,
    kind: 'fixture',
    scenario: runKey(s.id, true),
    model: AGENT_MODEL,
    recordedAt,
    promptVersion: 'agent-v1',
    steps: recorder.steps,
    run: {
      scenarioId: s.id,
      guardrails: true,
      persona: s.persona,
      provider: 'byok-anthropic',
      effort: 'medium',
    },
    approvals: [{ toolName: 'draft_email', decision: 'approved', decidedBy: 'author' }],
  });
}

const renderPage = (path = '/agent') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AgentPage />
    </MemoryRouter>,
  );

afterEach(() => {
  mocks.recording = undefined;
  mocks.provider = undefined;
  mocks.keys = [];
});

describe('AgentPage', () => {
  it('works without recordings: every scenario says it is not recorded yet', () => {
    renderPage();
    expect(screen.getAllByRole('radio', { name: /Běžný dotaz|Prompt injection/ })).toHaveLength(2);
    expect(screen.getByTestId('agent-not-recorded').textContent).toBe(cs.agent.run.notRecorded);
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: cs.agent.run.start }).disabled,
    ).toBe(true);
    expect(screen.getByText(cs.agent.result.empty)).toBeTruthy();
  });

  it('selects the scenario from the link and shows its persona and message', () => {
    renderPage('/agent?scenario=s4-rodne-cislo');
    expect(
      screen.getByRole<HTMLInputElement>('radio', {
        name: new RegExp(cs.agent.scenarios['s4-rodne-cislo'].title),
      }).checked,
    ).toBe(true);
    expect(screen.getByText(SCENARIOS['s4-rodne-cislo'].userMessage)).toBeTruthy();
  });

  it('replays a recording live: recorded approval, answer, draft and trace', async () => {
    mocks.recording = await fixtureRecording();
    renderPage('/agent?scenario=s2-injekce');
    // The test recording is a hand-written fixture and must say so.
    expect(screen.getByTestId('agent-provenance').textContent).toBe(cs.agent.provenance.fixture);

    fireEvent.click(screen.getByRole('button', { name: cs.agent.run.start }));
    const dialog = await screen.findByTestId('approval-dialog', {}, { timeout: 3000 });
    // The human sees the real name; the model only ever saw the placeholder.
    expect(within(dialog).getByText('Dobrý den, Petru Malou.')).toBeTruthy();
    expect(within(dialog).getByText(cs.agent.approval.decisions.approved)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: cs.agent.approval.continue }));

    const answer = await screen.findByTestId('agent-answer', {}, { timeout: 3000 });
    expect(answer.textContent).toContain('Koncept je připravený ke kontrole.');
    expect(screen.getByTestId('agent-draft').textContent).toContain(cs.agent.result.draftNotSent);

    const trace = screen.getByTestId('trace-panel');
    const decisions = within(trace).getAllByText(/prompt-injection|human-approval/);
    expect(decisions.length).toBeGreaterThan(0);
    expect(trace.textContent).not.toContain('Petru Malou');
  });

  it('says how the recording reached the model', async () => {
    const fixture = await fixtureRecording();
    mocks.recording = { ...fixture, run: { ...fixture.run, provider: 'claude-code' } };
    renderPage('/agent?scenario=s2-injekce');
    const provenance = screen.getByLabelText(cs.agent.provenance.label);
    expect(within(provenance).getByText(cs.agent.provenance.providers['claude-code'])).toBeTruthy();
    expect(within(provenance).getByText(cs.agent.provenance.claudeCodeNote)).toBeTruthy();
  });

  it('switching guardrails off without a recording disables the run', async () => {
    mocks.recording = await fixtureRecording();
    renderPage('/agent?scenario=s2-injekce');
    // The first guardrails switch belongs to the recorded scenarios, the second to BYOK.
    fireEvent.click(screen.getAllByRole('radio', { name: cs.agent.run.guardrailsOff })[0]!);
    expect(screen.getByTestId('agent-not-recorded')).toBeTruthy();
  });

  it('BYOK: runs live with the key only in memory and asks the visitor to approve', async () => {
    mocks.provider = scripted(s2Turns);
    renderPage();
    const panel = screen.getByTestId('byok-panel');
    fireEvent.change(within(panel).getByLabelText(cs.agent.byok.keyLabel), {
      target: { value: 'test-key-not-real' },
    });
    fireEvent.change(within(panel).getByLabelText(cs.agent.byok.queryLabel), {
      target: { value: SCENARIOS['s2-injekce'].userMessage },
    });
    fireEvent.click(within(panel).getByRole('radio', { name: cs.agent.run.personas.poradce }));
    fireEvent.click(within(panel).getByRole('button', { name: cs.agent.byok.start }));

    const dialog = await screen.findByTestId('approval-dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: cs.agent.approval.reject }));

    await waitFor(() => expect(screen.getByTestId('agent-answer')).toBeTruthy());
    expect(screen.getByText(cs.agent.result.liveLabel)).toBeTruthy();
    expect(screen.queryByTestId('agent-draft')).toBeNull();
    expect(mocks.keys).toEqual(['test-key-not-real']);

    // The key never lands in storage, the URL or the trace.
    expect(localStorage.length + sessionStorage.length).toBe(0);
    expect(window.location.href).not.toContain('test-key');
    expect(screen.getByTestId('trace-panel').textContent).not.toContain('test-key');

    fireEvent.click(within(panel).getByRole('button', { name: cs.agent.byok.forget }));
    expect(within(panel).getByLabelText<HTMLInputElement>(cs.agent.byok.keyLabel).value).toBe('');
  });
});
