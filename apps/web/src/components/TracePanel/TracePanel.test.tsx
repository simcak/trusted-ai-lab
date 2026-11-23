import type { TraceEvent } from '@trusted-ai-lab/llm-core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cs } from '../../i18n/cs.ts';
import { TracePanel } from './TracePanel.tsx';

const events: TraceEvent[] = [
  {
    id: 'evt-0001',
    seq: 1,
    timestamp: '2026-11-23T10:00:00.000Z',
    type: 'llm_call',
    name: 'replay',
    step: 0,
    input: { messages: [{ role: 'user', content: 'Ahoj' }] },
    output: { content: 'Dobrý den', toolCalls: [], stopReason: 'stop' },
    usage: { inputTokens: 1200, outputTokens: 34 },
    latencyMs: 640,
    provider: 'replay',
    model: 'fixture',
  },
  {
    id: 'evt-0002',
    seq: 2,
    timestamp: '2026-11-23T10:00:01.000Z',
    type: 'policy_decision',
    name: 'tool-allowlist',
    step: 1,
    policy: {
      decision: 'deny',
      rule: 'tool-allowlist',
      reason: 'Persona klient nesmí volat draft_email.',
    },
  },
];

function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('TracePanel', () => {
  it('shows an empty state and disables copying without events', () => {
    render(<TracePanel events={[]} />);
    expect(screen.getByText(cs.trace.empty)).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: cs.trace.copy }).disabled).toBe(
      true,
    );
  });

  it('renders every event with its type, step, tokens and latency', () => {
    render(<TracePanel events={events} title="Můj trace" />);

    expect(screen.getByRole('heading', { name: 'Můj trace' })).toBeTruthy();
    const items = screen.getAllByTestId('trace-event');
    expect(items).toHaveLength(2);

    const first = within(items[0]!);
    expect(first.getByText(cs.trace.types.llm_call)).toBeTruthy();
    expect(first.getByText(`${cs.trace.step} 0`)).toBeTruthy();
    // Czech number format uses a (narrow) no-break space as the thousands separator.
    expect(first.getByText(/1\s200 \/ 34/)).toBeTruthy();
    expect(first.getByText(`640 ms (${cs.trace.recordedSuffix})`)).toBeTruthy();
  });

  it('shows the policy decision with rule and reason as text, not only colour', () => {
    render(<TracePanel events={events} />);
    const second = within(screen.getAllByTestId('trace-event')[1]!);
    expect(second.getByText(cs.trace.decisions.deny)).toBeTruthy();
    expect(second.getByText('Persona klient nesmí volat draft_email.')).toBeTruthy();
  });

  it('sums tokens and latency in the summary', () => {
    render(<TracePanel events={events} />);
    const summary = within(screen.getByLabelText(cs.trace.summary));
    expect(summary.getByText('2')).toBeTruthy();
    expect(summary.getByText('640 ms')).toBeTruthy();
  });

  it('copies the trace as JSON that round-trips to the same events', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    mockClipboard(writeText);
    render(<TracePanel events={events} />);

    fireEvent.click(screen.getByRole('button', { name: cs.trace.copy }));

    expect(await screen.findByText(cs.trace.copied)).toBeTruthy();
    expect(writeText).toHaveBeenCalledOnce();
    expect(JSON.parse(writeText.mock.calls[0]![0])).toEqual(events);
  });

  it('falls back to a read-only textarea when the clipboard is unavailable', async () => {
    mockClipboard(() => Promise.reject(new Error('denied')));
    render(<TracePanel events={events} />);

    fireEvent.click(screen.getByRole('button', { name: cs.trace.copy }));

    expect(await screen.findByText(cs.trace.copyFailed)).toBeTruthy();
    const textarea = screen.getByLabelText<HTMLTextAreaElement>(cs.trace.manualCopyLabel);
    expect(textarea.readOnly).toBe(true);
    expect(JSON.parse(textarea.value)).toEqual(events);
  });

  it('drops a stale "copied" status when new events arrive', async () => {
    mockClipboard(() => Promise.resolve());
    const { rerender } = render(<TracePanel events={events.slice(0, 1)} />);
    fireEvent.click(screen.getByRole('button', { name: cs.trace.copy }));
    expect(await screen.findByText(cs.trace.copied)).toBeTruthy();

    rerender(<TracePanel events={events} />);
    expect(screen.queryByText(cs.trace.copied)).toBeNull();
  });
});
