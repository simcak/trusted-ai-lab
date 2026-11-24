import { stripProviderState } from './request-hash.ts';
import type { TraceLog } from './trace.ts';
import type { LlmProvider, LlmRequest } from './types.ts';

export interface TracingOptions {
  /**
   * `full` (default): the whole request in every `llm_call` event.
   * `delta`: the system prompt only on step 0, then just the messages added since the previous
   * call of the same scenario, plus tool names. Long agent traces stay readable instead of
   * repeating the whole history in every event.
   */
  input?: 'full' | 'delta';
}

/** What the trace shows of a request: everything the model saw, minus opaque provider data. */
export function traceableRequest(req: LlmRequest): LlmRequest {
  return { ...req, messages: req.messages.map(stripProviderState) };
}

/**
 * Wraps any provider so every `complete()` call produces a TraceEvent.
 * Tracing is a separate layer, not each provider's responsibility.
 * The request object never carries credentials (BYOK keys stay inside the provider),
 * so recording it in the trace cannot leak a key. Provider-native state (thinking signatures)
 * is stripped.
 */
export function withTracing(
  provider: LlmProvider,
  log: TraceLog,
  options: TracingOptions = {},
): LlmProvider {
  const sentByScenario = new Map<string, number>();

  const describeInput = (req: LlmRequest): unknown => {
    const ctx = req.context;
    if (options.input !== 'delta' || !ctx) return traceableRequest(req);
    const previous = ctx.step === 0 ? 0 : (sentByScenario.get(ctx.scenario) ?? 0);
    sentByScenario.set(ctx.scenario, req.messages.length);
    return {
      ...(ctx.step === 0 && req.system !== undefined && { system: req.system }),
      tools: req.tools?.map((t) => t.name) ?? [],
      maxTokens: req.maxTokens,
      messageCount: req.messages.length,
      newMessages: req.messages.slice(previous).map(stripProviderState),
    };
  };

  return {
    id: provider.id,
    async complete(req, signal) {
      const correlation = {
        name: provider.id,
        scenario: req.context?.scenario,
        step: req.context?.step,
        input: describeInput(req),
      };
      try {
        const res = await provider.complete(req, signal);
        log.emit({
          ...correlation,
          type: 'llm_call',
          output: { content: res.content, toolCalls: res.toolCalls, stopReason: res.stopReason },
          usage: res.usage,
          latencyMs: res.latencyMs,
          provider: res.provider,
          model: res.model,
        });
        return res;
      } catch (err) {
        log.emit({
          ...correlation,
          type: 'error',
          provider: provider.id,
          error:
            err instanceof Error
              ? { name: err.name, message: err.message }
              : { name: 'Error', message: String(err) },
        });
        throw err;
      }
    },
  };
}
