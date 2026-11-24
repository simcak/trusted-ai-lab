import type { RecordedStep, Recording } from './recording.ts';
import { hashRequest } from './request-hash.ts';
import type { LlmProvider, LlmRequest, LlmResponse } from './types.ts';

export class ReplayMissError extends Error {
  override readonly name = 'ReplayMissError';
  readonly scenario: string | undefined;
  readonly step: number | undefined;

  constructor(scenario: string | undefined, step: number | undefined) {
    super(
      scenario === undefined
        ? 'Replay requires request.context with scenario and step'
        : `No recorded response for scenario "${scenario}", step ${String(step)}`,
    );
    this.scenario = scenario;
    this.step = step;
  }
}

/** The code sent a different request than the one the recorded response answered. */
export class ReplayDriftError extends Error {
  override readonly name = 'ReplayDriftError';
  readonly scenario: string;
  readonly step: number;

  constructor(scenario: string, step: number) {
    super(
      `Request for scenario "${scenario}", step ${String(step)} differs from the recorded one — re-record the scenario`,
    );
    this.scenario = scenario;
    this.step = step;
  }
}

export interface ReplayProviderOptions {
  /** Artificial delay before resolving, so the UI can show a loading state. Default 0. */
  delayMs?: number;
  /** Compare `hashRequest(req)` with the recorded `requestHash` and throw `ReplayDriftError` on mismatch. */
  verifyRequest?: boolean;
}

interface IndexedStep {
  recording: Recording;
  step: RecordedStep;
}

const keyOf = (scenario: string, step: number) => `${scenario}#${step}`;

/**
 * Deterministic provider that answers from recorded responses, keyed by `scenario + step`.
 * Default mode of the whole demo: works offline, needs no API key, costs nothing.
 */
export class ReplayProvider implements LlmProvider {
  readonly id = 'replay' as const;
  private readonly index = new Map<string, IndexedStep>();
  private readonly recordingsByScenario = new Map<string, Recording>();
  private readonly delayMs: number;
  private readonly verifyRequest: boolean;

  constructor(recordings: readonly Recording[], options: ReplayProviderOptions = {}) {
    this.delayMs = options.delayMs ?? 0;
    this.verifyRequest = options.verifyRequest ?? false;
    for (const recording of recordings) {
      if (this.recordingsByScenario.has(recording.scenario)) {
        throw new Error(`Duplicate recording for scenario "${recording.scenario}"`);
      }
      this.recordingsByScenario.set(recording.scenario, recording);
      for (const step of recording.steps) {
        this.index.set(keyOf(recording.scenario, step.step), { recording, step });
      }
    }
  }

  /** Metadata (model, date, prompt version, kind) the UI shows next to a replayed trace. */
  getRecording(scenario: string): Recording | undefined {
    return this.recordingsByScenario.get(scenario);
  }

  async complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResponse> {
    signal?.throwIfAborted();
    const ctx = req.context;
    if (!ctx) throw new ReplayMissError(undefined, undefined);

    const hit = this.index.get(keyOf(ctx.scenario, ctx.step));
    if (!hit) throw new ReplayMissError(ctx.scenario, ctx.step);

    if (this.verifyRequest && (await hashRequest(req)) !== hit.step.requestHash) {
      throw new ReplayDriftError(ctx.scenario, ctx.step);
    }

    if (this.delayMs > 0) await sleep(this.delayMs, signal);
    signal?.throwIfAborted();

    // Clone so callers can never mutate the recording and break determinism.
    return { ...structuredClone(hit.step.response), provider: this.id };
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function abortReason(signal?: AbortSignal): Error {
  const reason: unknown = signal?.reason;
  return reason instanceof Error ? reason : new DOMException('Aborted', 'AbortError');
}
