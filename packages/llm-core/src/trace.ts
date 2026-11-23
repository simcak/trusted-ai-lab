import { z } from 'zod';
import { LlmUsageSchema, ProviderIdSchema } from './types.ts';

export const TraceEventTypeSchema = z.enum([
  'llm_call',
  'tool_call',
  'policy_decision',
  'pii',
  'error',
  'info',
]);
export type TraceEventType = z.infer<typeof TraceEventTypeSchema>;

export const PolicyDecisionSchema = z.object({
  decision: z.enum(['allow', 'deny', 'require_approval', 'modify']),
  /** Id of the policy rule that produced the decision. */
  rule: z.string().min(1),
  /** Human-readable reason — always required, a decision without a reason is not auditable. */
  reason: z.string().min(1),
});
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

export const TraceErrorSchema = z.object({
  name: z.string(),
  message: z.string(),
});

export const TraceEventSchema = z.object({
  id: z.string().min(1),
  /** 1-based position in the trace. */
  seq: z.number().int().positive(),
  timestamp: z.iso.datetime(),
  type: TraceEventTypeSchema,
  /** Tool name, rule id, provider id… depending on `type`. */
  name: z.string().min(1).optional(),
  scenario: z.string().min(1).optional(),
  step: z.number().int().nonnegative().optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  usage: LlmUsageSchema.optional(),
  latencyMs: z.number().nonnegative().optional(),
  provider: ProviderIdSchema.optional(),
  model: z.string().min(1).optional(),
  policy: PolicyDecisionSchema.optional(),
  error: TraceErrorSchema.optional(),
});
export type TraceEvent = z.infer<typeof TraceEventSchema>;

/** What callers emit; the log assigns `id`, `seq` and `timestamp`. */
export type TraceEventInput = Omit<TraceEvent, 'id' | 'seq' | 'timestamp'>;

/** Members are plain functions (not `this`-bound methods), so they can be passed around directly. */
export interface TraceLog {
  emit: (event: TraceEventInput) => TraceEvent;
  /** Immutable snapshot; a new array reference after every change (fits `useSyncExternalStore`). */
  getSnapshot: () => readonly TraceEvent[];
  subscribe: (listener: () => void) => () => void;
  clear: () => void;
}

export interface TraceLogOptions {
  /** Injectable clock so tests and replays produce identical traces. */
  now?: () => Date;
}

export function createTraceLog(options: TraceLogOptions = {}): TraceLog {
  const now = options.now ?? (() => new Date());
  const listeners = new Set<() => void>();
  let events: readonly TraceEvent[] = [];

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    emit: (input) => {
      const seq = events.length + 1;
      const event: TraceEvent = {
        ...input,
        id: `evt-${String(seq).padStart(4, '0')}`,
        seq,
        timestamp: now().toISOString(),
      };
      events = [...events, event];
      notify();
      return event;
    },
    getSnapshot: () => events,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    clear: () => {
      if (events.length === 0) return;
      events = [];
      notify();
    },
  };
}
