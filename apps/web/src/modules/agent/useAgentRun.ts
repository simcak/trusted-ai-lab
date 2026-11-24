import {
  ReplayIncompleteError,
  type AgentRunResult,
  type ApprovalOutcome,
  type ApprovalRequest,
} from '@trusted-ai-lab/agent-runtime';
import {
  LlmProviderError,
  ReplayDriftError,
  ReplayMissError,
  createTraceLog,
  type LlmErrorCode,
  type TraceLog,
} from '@trusted-ai-lab/llm-core';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

export type RunKind = 'replay' | 'live';
export type RunErrorCode = LlmErrorCode | 'drift' | 'aborted';

export interface RunState {
  status: 'idle' | 'running' | 'done' | 'error';
  kind?: RunKind;
  userMessage?: string;
  result?: AgentRunResult;
  error?: RunErrorCode;
}

/** An approval the UI must show: `recorded` is set in replay (the decision is already known). */
export interface PendingApproval {
  request: ApprovalRequest;
  recorded?: ApprovalOutcome;
  resolve: (outcome: ApprovalOutcome) => void;
}

export interface RunContext {
  log: TraceLog;
  signal: AbortSignal;
  /** Shows the approval dialog and waits for the visitor. */
  approve: (request: ApprovalRequest, recorded?: ApprovalOutcome) => Promise<ApprovalOutcome>;
}

function errorCode(err: unknown): RunErrorCode {
  if (err instanceof DOMException && err.name === 'AbortError') return 'aborted';
  if (
    err instanceof ReplayDriftError ||
    err instanceof ReplayMissError ||
    err instanceof ReplayIncompleteError
  ) {
    return 'drift';
  }
  if (err instanceof LlmProviderError) return err.code;
  return 'unknown';
}

/** One agent run at a time: trace log, approval dialog and cancellation for the page. */
export function useAgentRun() {
  const [log] = useState(() => createTraceLog());
  const events = useSyncExternalStore(log.subscribe, log.getSnapshot);
  const [state, setState] = useState<RunState>({ status: 'idle' });
  const [pending, setPending] = useState<PendingApproval | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const start = useCallback(
    async (
      kind: RunKind,
      userMessage: string,
      job: (ctx: RunContext) => Promise<AgentRunResult>,
    ) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const { signal } = controller;
      log.clear();
      setPending(null);
      setState({ status: 'running', kind, userMessage });

      const approve: RunContext['approve'] = (request, recorded) =>
        new Promise((resolve, reject) => {
          const onAbort = () => {
            setPending(null);
            reject(new DOMException('Aborted', 'AbortError'));
          };
          signal.addEventListener('abort', onAbort, { once: true });
          setPending({
            request,
            ...(recorded && { recorded }),
            resolve: (outcome) => {
              signal.removeEventListener('abort', onAbort);
              setPending(null);
              resolve(outcome);
            },
          });
        });

      try {
        const result = await job({ log, signal, approve });
        if (!signal.aborted) setState({ status: 'done', kind, userMessage, result });
      } catch (err) {
        if (!signal.aborted)
          setState({ status: 'error', kind, userMessage, error: errorCode(err) });
      }
    },
    [log],
  );

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    log.clear();
    setPending(null);
    setState({ status: 'idle' });
  }, [log]);

  return { events, state, pending, start, reset };
}
