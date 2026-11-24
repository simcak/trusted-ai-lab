import Anthropic, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
} from '@anthropic-ai/sdk';
import type {
  BetaContentBlock,
  BetaContentBlockParam,
  BetaMessage,
  BetaMessageParam,
  BetaStopReason,
  BetaTool,
  BetaToolResultBlockParam,
} from '@anthropic-ai/sdk/resources/beta/messages/messages';
import {
  LlmProviderError,
  type AssistantMessage,
  type LlmMessage,
  type LlmProvider,
  type LlmResponse,
  type StopReason,
} from './types.ts';

export type AnthropicEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface AnthropicProviderOptions {
  /** Exact model id, e.g. `claude-sonnet-5-5`. */
  model: string;
  /**
   * Browser (BYOK) mode. Sets the SDK's `dangerouslyAllowBrowser`, which adds the
   * `anthropic-dangerous-direct-browser-access: true` header the API requires for CORS requests.
   */
  browser: boolean;
  /**
   * Required in the browser. In Node it may be omitted: the SDK then resolves credentials itself
   * (`ANTHROPIC_API_KEY`, or a profile from `ant auth login`).
   */
  apiKey?: string;
  /** `output_config.effort`; set explicitly because defaults differ between models. */
  effort?: AnthropicEffort;
  /** Default `max_tokens` when the request does not set one. Thinking counts towards it. */
  maxTokens?: number;
  /** Server-side refusal fallback (beta). Only some models support it. */
  fallbacks?: 'default';
  maxRetries?: number;
  timeoutMs?: number;
  /** Injected in tests; defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

export const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
const DEFAULT_MAX_TOKENS = 16_000;

/**
 * `LlmProvider` over the official Anthropic SDK (Messages API, beta namespace for `fallbacks`).
 * The key lives only inside the SDK client in this closure: it is not part of any request object,
 * trace event, error message or log (`logLevel: 'off'`).
 */
export function createAnthropicProvider(options: AnthropicProviderOptions): LlmProvider {
  if (options.browser && !options.apiKey) {
    throw new LlmProviderError('auth', 'An API key is required in the browser');
  }
  const client = new Anthropic({
    ...(options.apiKey !== undefined && { apiKey: options.apiKey }),
    dangerouslyAllowBrowser: options.browser,
    maxRetries: options.maxRetries ?? (options.browser ? 1 : 2),
    timeout: options.timeoutMs ?? 120_000,
    logLevel: 'off',
    ...(options.fetch && { fetch: options.fetch }),
  });

  return {
    id: 'byok-anthropic',
    async complete(req, signal) {
      const started = performance.now();
      let message: BetaMessage;
      let requestId: string | null | undefined;
      try {
        const result = await client.beta.messages
          .create(
            {
              model: options.model,
              max_tokens: req.maxTokens ?? options.maxTokens ?? DEFAULT_MAX_TOKENS,
              ...(req.system !== undefined && { system: req.system }),
              messages: toAnthropicMessages(req.messages),
              ...(req.tools?.length && {
                tools: req.tools.map((tool): BetaTool => ({
                  name: tool.name,
                  description: tool.description,
                  input_schema: tool.inputSchema as BetaTool.InputSchema,
                })),
              }),
              ...(options.effort && { output_config: { effort: options.effort } }),
              ...(options.fallbacks && { betas: [FALLBACK_BETA], fallbacks: options.fallbacks }),
            },
            { signal },
          )
          .withResponse();
        message = result.data;
        requestId = result.request_id;
      } catch (err) {
        throw toProviderError(err);
      }
      return fromAnthropicMessage(message, requestId, performance.now() - started);
    },
  };
}

/** Maps provider-neutral messages onto the Messages API shape. Exported for tests. */
export function toAnthropicMessages(messages: readonly LlmMessage[]): BetaMessageParam[] {
  const out: BetaMessageParam[] = [];
  for (const m of messages) {
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.content });
    } else if (m.role === 'assistant') {
      out.push({ role: 'assistant', content: assistantContent(m) });
    } else {
      const block: BetaToolResultBlockParam = {
        type: 'tool_result',
        tool_use_id: m.toolCallId,
        content: m.content,
        ...(m.isError && { is_error: true }),
      };
      // All results of one assistant turn go into a single user message.
      const last = out.at(-1);
      if (
        last?.role === 'user' &&
        Array.isArray(last.content) &&
        last.content.every((b) => b.type === 'tool_result')
      ) {
        last.content.push(block);
      } else {
        out.push({ role: 'user', content: [block] });
      }
    }
  }
  return out;
}

function assistantContent(m: AssistantMessage): BetaContentBlockParam[] {
  // Thinking blocks must go back exactly as the API returned them (preserved thinking).
  if (Array.isArray(m.providerState)) return m.providerState as BetaContentBlockParam[];
  const blocks: BetaContentBlockParam[] = [];
  if (m.content) blocks.push({ type: 'text', text: m.content });
  for (const call of m.toolCalls ?? []) {
    blocks.push({ type: 'tool_use', id: call.id, name: call.name, input: call.arguments });
  }
  return blocks;
}

const STOP_REASONS: Partial<Record<BetaStopReason, StopReason>> = {
  end_turn: 'stop',
  stop_sequence: 'stop',
  tool_use: 'tool_use',
  max_tokens: 'max_tokens',
  model_context_window_exceeded: 'max_tokens',
  refusal: 'refusal',
};

export function fromAnthropicMessage(
  message: BetaMessage,
  requestId: string | null | undefined,
  latencyMs: number,
): LlmResponse {
  const stopReason = message.stop_reason ? STOP_REASONS[message.stop_reason] : undefined;
  if (!stopReason) {
    throw new LlmProviderError(
      'unknown',
      `Unexpected stop reason "${String(message.stop_reason)}"`,
    );
  }
  const text = message.content
    .filter((b): b is Extract<BetaContentBlock, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('\n\n');
  const toolCalls = message.content
    .filter((b): b is Extract<BetaContentBlock, { type: 'tool_use' }> => b.type === 'tool_use')
    .map((b) => ({ id: b.id, name: b.name, arguments: b.input }));
  const usage = message.usage;
  return {
    content: text,
    toolCalls,
    stopReason,
    usage: {
      // Everything the model read, whether or not it came from the prompt cache.
      inputTokens:
        usage.input_tokens +
        (usage.cache_creation_input_tokens ?? 0) +
        (usage.cache_read_input_tokens ?? 0),
      outputTokens: usage.output_tokens,
    },
    latencyMs: Math.round(latencyMs),
    model: message.model,
    provider: 'byok-anthropic',
    ...(requestId && { requestId }),
    providerState: message.content,
  };
}

/** Typed SDK errors → stable codes. Messages stay technical (English) and never include the key. */
export function toProviderError(err: unknown): Error {
  if (err instanceof APIUserAbortError) return new DOMException('Aborted', 'AbortError');
  if (err instanceof APIConnectionTimeoutError) {
    return new LlmProviderError('timeout', 'The API did not answer in time');
  }
  if (err instanceof APIConnectionError) {
    return new LlmProviderError('network', 'Could not reach the API (network or CORS)');
  }
  if (err instanceof APIError) {
    // `instanceof` narrows the generic class to APIError<any>; restate the declared defaults.
    const { status, message: detail } = err as APIError;
    if (status === 401) {
      // ZDR / Compliance API organisations cannot call the API from a browser at all.
      const cors = /CORS requests are not allowed/i.test(detail);
      return new LlmProviderError(cors ? 'cors_forbidden' : 'auth', detail, status);
    }
    if (status === 403) return new LlmProviderError('permission', detail, status);
    if (status === 429) return new LlmProviderError('rate_limit', detail, status);
    if (status !== undefined && status >= 500)
      return new LlmProviderError('server', detail, status);
    if (status !== undefined) return new LlmProviderError('bad_request', detail, status);
  }
  if (err instanceof LlmProviderError) return err;
  return new LlmProviderError('unknown', err instanceof Error ? err.message : String(err));
}
