import type { LlmProvider, LlmRequest, LlmResponse, ToolCall } from '@trusted-ai-lab/llm-core';
import fundsJson from '../../../data/funds.json' with { type: 'json' };
import { FundsFileSchema } from './funds.ts';

/** Test helpers only — hand-written model behaviour, never presented as model output. */

export const FUNDS = FundsFileSchema.parse(fundsJson).funds;

export interface ScriptedTurn {
  content?: string;
  toolCalls?: ToolCall[];
  stopReason?: LlmResponse['stopReason'];
}

export type ScriptStep = ScriptedTurn | ((req: LlmRequest) => ScriptedTurn);

export interface ScriptedProvider extends LlmProvider {
  readonly requests: LlmRequest[];
}

/**
 * A provider that answers from a script, one entry per call. Each response carries a fake
 * providerState so tests can check it is passed back unchanged and never traced.
 */
export function scriptedProvider(
  script: readonly ScriptStep[],
  repeatLast = false,
): ScriptedProvider {
  const requests: LlmRequest[] = [];
  return {
    id: 'byok-anthropic',
    requests,
    complete(req, signal) {
      signal?.throwIfAborted();
      requests.push(structuredClone(req));
      const index = requests.length - 1;
      const entry = script[index] ?? (repeatLast ? script.at(-1) : undefined);
      if (!entry) return Promise.reject(new Error(`Script has no step ${index}`));
      const turn = typeof entry === 'function' ? entry(req) : entry;
      const toolCalls = turn.toolCalls ?? [];
      return Promise.resolve({
        content: turn.content ?? '',
        toolCalls,
        stopReason: turn.stopReason ?? (toolCalls.length > 0 ? 'tool_use' : 'stop'),
        usage: { inputTokens: 1000, outputTokens: 100 },
        latencyMs: 50,
        model: 'scripted',
        provider: 'byok-anthropic',
        requestId: `req_${index}`,
        providerState: [{ type: 'thinking', signature: `sig-${index}` }],
      });
    },
  };
}

export const call = (id: string, name: string, args: unknown): ToolCall => ({
  id,
  name,
  arguments: args,
});

/** Provider that fails the test if the model is called at all. */
export const noModel: LlmProvider = {
  id: 'replay',
  complete: () => Promise.reject(new Error('The model must not be called')),
};
