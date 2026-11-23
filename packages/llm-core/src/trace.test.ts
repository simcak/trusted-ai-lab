import { describe, expect, it, vi } from 'vitest';
import { TraceEventSchema, createTraceLog } from './trace.ts';

const fixedClock = () => new Date('2026-11-23T10:00:00.000Z');

describe('createTraceLog', () => {
  it('assigns sequential ids, seq and timestamps from the injected clock', () => {
    const log = createTraceLog({ now: fixedClock });
    const a = log.emit({ type: 'info', name: 'start' });
    const b = log.emit({ type: 'info', name: 'next' });

    expect(a).toMatchObject({ id: 'evt-0001', seq: 1, timestamp: '2026-11-23T10:00:00.000Z' });
    expect(b).toMatchObject({ id: 'evt-0002', seq: 2 });
    expect(log.getSnapshot()).toEqual([a, b]);
  });

  it('produces identical traces for identical input (deterministic)', () => {
    const run = () => {
      const log = createTraceLog({ now: fixedClock });
      log.emit({ type: 'llm_call', usage: { inputTokens: 1, outputTokens: 2 } });
      return log.getSnapshot();
    };
    expect(run()).toEqual(run());
  });

  it('returns a new snapshot reference only when events change', () => {
    const log = createTraceLog({ now: fixedClock });
    const empty = log.getSnapshot();
    expect(log.getSnapshot()).toBe(empty);
    log.emit({ type: 'info' });
    expect(log.getSnapshot()).not.toBe(empty);
  });

  it('notifies subscribers until they unsubscribe', () => {
    const log = createTraceLog({ now: fixedClock });
    const listener = vi.fn();
    const unsubscribe = log.subscribe(listener);
    log.emit({ type: 'info' });
    unsubscribe();
    log.emit({ type: 'info' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('clear() empties the log and restarts numbering', () => {
    const log = createTraceLog({ now: fixedClock });
    log.emit({ type: 'info' });
    log.clear();
    expect(log.getSnapshot()).toEqual([]);
    expect(log.emit({ type: 'info' }).seq).toBe(1);
  });

  it('emitted events satisfy TraceEventSchema', () => {
    const log = createTraceLog({ now: fixedClock });
    const event = log.emit({
      type: 'policy_decision',
      name: 'tool-allowlist',
      policy: {
        decision: 'deny',
        rule: 'tool-allowlist',
        reason: 'Persona klient nesmí volat draft_email',
      },
    });
    expect(TraceEventSchema.parse(event)).toEqual(event);
  });
});

describe('TraceEventSchema', () => {
  const base = { id: 'evt-0001', seq: 1, timestamp: '2026-11-23T10:00:00.000Z', type: 'info' };

  it('rejects a policy decision without a reason', () => {
    const result = TraceEventSchema.safeParse({
      ...base,
      type: 'policy_decision',
      policy: { decision: 'deny', rule: 'x', reason: '' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown event types and non-ISO timestamps', () => {
    expect(TraceEventSchema.safeParse({ ...base, type: 'magic' }).success).toBe(false);
    expect(TraceEventSchema.safeParse({ ...base, timestamp: 'yesterday' }).success).toBe(false);
  });
});
