import type { TraceLog } from './trace.ts';
import type { LlmProvider } from './types.ts';

/**
 * Wraps any provider so every `complete()` call produces a TraceEvent.
 * Tracing is a separate layer, not each provider's responsibility.
 * The request object never carries credentials (BYOK keys stay inside the provider),
 * so recording it in the trace cannot leak a key.
 */
export function withTracing(provider: LlmProvider, log: TraceLog): LlmProvider {
  return {
    id: provider.id,
    async complete(req, signal) {
      const correlation = {
        name: provider.id,
        scenario: req.context?.scenario,
        step: req.context?.step,
        input: req,
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
