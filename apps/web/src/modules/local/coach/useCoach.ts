import { withTracing, type LlmProvider, type TraceLog } from '@trusted-ai-lab/llm-core';
import {
  createWebLlmProvider,
  stripThinking,
  type WebLlmStats,
} from '@trusted-ai-lab/llm-core/webllm';
import { detect, redact } from '@trusted-ai-lab/pii-cz';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CoachInput } from '../activity/summary.ts';
import type { NetworkMonitor } from '../network/network-monitor.ts';
import { deleteCachedModel, isModelCached } from './cache.ts';
import { classifyLoadError, startModelWorker, type LoadErrorKind } from './engine.ts';
import { COACH_MODELS, DEFAULT_MODEL, type CoachModelKey, type ModelVariant } from './model.ts';
import { plainAnswer } from './plain-answer.ts';
import { buildCoachRequest, COACH_SAMPLING } from './prompt.ts';
import { detectWebGpu, type GpuStatus } from './webgpu.ts';
import type { LocalModelClient } from './worker-client.ts';

export type LoadState =
  | { status: 'idle' }
  | { status: 'loading'; fraction: number }
  | { status: 'ready'; key: CoachModelKey }
  | { status: 'error'; kind: LoadErrorKind };

export type AnswerState =
  | { status: 'idle' }
  | { status: 'writing'; text: string; question: string | undefined; redactions: number }
  | {
      status: 'done';
      text: string;
      question: string | undefined;
      redactions: number;
      stats: WebLlmStats | undefined;
      stopped: boolean;
    }
  | { status: 'error' };

/** WebGPU check, model download and the local model's answers, all inside this browser. */
export function useCoach(network: NetworkMonitor, log: TraceLog) {
  const [gpu, setGpu] = useState<GpuStatus | null>(null);
  const [modelKey, setModelKey] = useState<CoachModelKey>(DEFAULT_MODEL);
  const [cached, setCached] = useState<Partial<Record<CoachModelKey, boolean>>>({});
  const [load, setLoad] = useState<LoadState>({ status: 'idle' });
  const [answer, setAnswer] = useState<AnswerState>({ status: 'idle' });
  const [forceF32, setForceF32] = useState(false);

  const clientRef = useRef<LocalModelClient | null>(null);
  const providerRef = useRef<LlmProvider | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const textRef = useRef('');
  const statsRef = useRef<WebLlmStats | undefined>(undefined);

  const variantFor = useCallback(
    (key: CoachModelKey): ModelVariant =>
      COACH_MODELS[key].variants[
        gpu?.status === 'ok' && gpu.shaderF16 && !forceF32 ? 'f16' : 'f32'
      ],
    [gpu, forceF32],
  );

  useEffect(() => {
    let cancelled = false;
    void detectWebGpu().then((status) => !cancelled && setGpu(status));
    return () => {
      cancelled = true;
      controllerRef.current?.abort();
      clientRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (gpu?.status !== 'ok') return;
    let cancelled = false;
    for (const key of Object.keys(COACH_MODELS) as CoachModelKey[]) {
      void isModelCached(variantFor(key)).then(
        (hit) => !cancelled && setCached((prev) => ({ ...prev, [key]: hit })),
      );
    }
    return () => {
      cancelled = true;
    };
  }, [gpu, variantFor]);

  const unload = useCallback(() => {
    controllerRef.current?.abort();
    clientRef.current?.terminate();
    clientRef.current = null;
    providerRef.current = null;
  }, []);

  const loadModel = useCallback(async () => {
    unload();
    const key = modelKey;
    const variant = variantFor(key);
    setAnswer({ status: 'idle' });
    setLoad({ status: 'loading', fraction: 0 });
    // Everything requested from now until the model is ready is the separate "download" step.
    const endDownload = network.beginModelDownload();
    const client = startModelWorker((entries) => network.add(entries));
    clientRef.current = client;
    try {
      await client.load(variant.modelId, (p) =>
        setLoad({ status: 'loading', fraction: p.fraction }),
      );
    } catch (err) {
      endDownload();
      if (clientRef.current === client) unload();
      const kind = classifyLoadError(err);
      // For developers: the raw reason (WebLLM errors arrive as text from the worker).
      console.warn('Local model failed to load:', err);
      if (kind === 'shader_f16') setForceF32(true);
      setLoad({ status: 'error', kind });
      return;
    }
    endDownload();
    providerRef.current = withTracing(
      createWebLlmProvider({
        engine: client.engine,
        model: variant.modelId,
        extraBody: { enable_thinking: false },
        sampling: COACH_SAMPLING,
        onText: (delta) => {
          textRef.current += delta;
          const text = plainAnswer(stripThinking(textRef.current));
          setAnswer((prev) => (prev.status === 'writing' ? { ...prev, text } : prev));
        },
        onStats: (stats) => (statsRef.current = stats),
      }),
      log,
    );
    setCached((prev) => ({ ...prev, [key]: true }));
    setLoad({ status: 'ready', key });
  }, [modelKey, variantFor, network, log, unload]);

  const run = useCallback(
    async (input: CoachInput, rawQuestion?: string) => {
      const provider = providerRef.current;
      if (!provider) return;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      let question: string | undefined;
      let redactions = 0;
      if (rawQuestion) {
        // Data minimisation also for the local model: names or phone numbers are not needed.
        const findings = detect(rawQuestion);
        question = redact(rawQuestion, findings);
        redactions = findings.length;
        log.emit({
          type: 'pii',
          name: 'redact_question',
          output: {
            replaced: findings.length,
            byType: Object.fromEntries(
              [...new Set(findings.map((f) => f.type))].map((t) => [
                t,
                findings.filter((f) => f.type === t).length,
              ]),
            ),
          },
        });
      }

      textRef.current = '';
      statsRef.current = undefined;
      setAnswer({ status: 'writing', text: '', question, redactions });
      try {
        const res = await provider.complete(buildCoachRequest(input, question), controller.signal);
        setAnswer({
          status: 'done',
          text: plainAnswer(res.content),
          question,
          redactions,
          stats: statsRef.current,
          stopped: false,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setAnswer({
            status: 'done',
            text: plainAnswer(stripThinking(textRef.current)),
            question,
            redactions,
            stats: undefined,
            stopped: true,
          });
        } else {
          setAnswer({ status: 'error' });
        }
      }
    },
    [log],
  );

  const stop = useCallback(() => controllerRef.current?.abort(), []);

  const deleteModel = useCallback(async () => {
    const key = modelKey;
    if (load.status === 'ready' && load.key === key) {
      unload();
      setLoad({ status: 'idle' });
    }
    await deleteCachedModel(variantFor(key));
    setCached((prev) => ({ ...prev, [key]: false }));
  }, [modelKey, load, unload, variantFor]);

  return {
    gpu,
    modelKey,
    setModelKey,
    variant: variantFor(modelKey),
    cached,
    load,
    answer,
    loadModel,
    explain: (input: CoachInput) => run(input),
    ask: (input: CoachInput, question: string) => run(input, question),
    stop,
    deleteModel,
  };
}
