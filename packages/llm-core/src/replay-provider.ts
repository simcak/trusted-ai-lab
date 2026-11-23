import type { RecordedStep, Recording } from './recording.ts';
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

export interface ReplayProviderOptions {
  /** Artificial delay before resolving, so the UI can show a loading state. Default 0. */
  delayMs?: number;
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

  constructor(recordings: readonly Recording[], options: ReplayProviderOptions = {}) {
    this.delayMs = options.delayMs ?? 0;
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

    if (this.delayMs > 0) await sleep(this.delayMs, signal);

    // Clone so callers can never mutate the recording and break determinism.
    return {
      ...structuredClone(hit.step.response),
      model: hit.recording.model,
      provider: this.id,
    };
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
