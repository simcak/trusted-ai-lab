import {
  LlmProviderError,
  type LlmMessage,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
  type StopReason,
} from './types.ts';

/**
 * The part of a WebLLM engine (`MLCEngine` or `WebWorkerMLCEngine` from `@mlc-ai/web-llm`) this
 * provider uses. Declared structurally so llm-core does not depend on WebLLM: the web app creates
 * the engine in its own lazily loaded chunk and tests pass a fake.
 */
export interface WebLlmEngine {
  chat: {
    completions: {
      create(request: WebLlmStreamingRequest): Promise<AsyncIterable<WebLlmChunk>>;
    };
  };
  interruptGenerate(): void | Promise<void>;
}

export interface WebLlmChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface WebLlmSampling {
  temperature?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
}

export interface WebLlmStreamingRequest extends WebLlmSampling {
  messages: WebLlmChatMessage[];
  stream: true;
  stream_options: { include_usage: true };
  max_tokens?: number;
  extra_body?: { enable_thinking?: boolean };
}

export interface WebLlmChunk {
  model: string;
  choices: Array<{
    delta: { content?: string | null };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'abort' | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    extra?: {
      decode_tokens_per_s?: number;
      prefill_tokens_per_s?: number;
      time_to_first_token_s?: number;
    };
  };
}

/** Speed reported by WebLLM for one request (only in the last streamed chunk). */
export interface WebLlmStats {
  decodeTokensPerSecond?: number;
  prefillTokensPerSecond?: number;
  timeToFirstTokenSeconds?: number;
}

export interface WebLlmProviderOptions {
  engine: WebLlmEngine;
  /** Model id the engine was loaded with, e.g. `Qwen3-1.7B-q4f16_1-MLC`. */
  model: string;
  /** Default `max_tokens` when the request does not set one. */
  maxTokens?: number;
  /** WebLLM-specific request fields, e.g. `{ enable_thinking: false }` for Qwen3. */
  extraBody?: WebLlmStreamingRequest['extra_body'];
  /**
   * Sampling for this model. Set by the caller because the right values depend on the model and
   * its mode (`LlmRequest` deliberately has no sampling fields).
   */
  sampling?: WebLlmSampling;
  /** Called with every streamed piece of text, so the page can show the answer as it is written. */
  onText?: (delta: string) => void;
  onStats?: (stats: WebLlmStats) => void;
}

const DEFAULT_MAX_TOKENS = 512;

/**
 * `LlmProvider` over a local WebLLM engine: the model runs on the visitor's GPU via WebGPU and the
 * request never leaves the device. Text only: tools and tool results are rejected.
 */
export function createWebLlmProvider(options: WebLlmProviderOptions): LlmProvider {
  return {
    id: 'webllm',
    async complete(req, signal) {
      signal?.throwIfAborted();
      const request: WebLlmStreamingRequest = {
        messages: toWebLlmMessages(req),
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: req.maxTokens ?? options.maxTokens ?? DEFAULT_MAX_TOKENS,
        ...options.sampling,
        ...(options.extraBody && { extra_body: options.extraBody }),
      };
      const interrupt = () => void options.engine.interruptGenerate();
      signal?.addEventListener('abort', interrupt, { once: true });

      const started = performance.now();
      let text = '';
      let finish: WebLlmChunk['choices'][number]['finish_reason'] = null;
      let usage: WebLlmChunk['usage'];
      let model = options.model;
      try {
        const stream = await options.engine.chat.completions.create(request);
        for await (const chunk of stream) {
          if (chunk.model) model = chunk.model;
          if (chunk.usage) usage = chunk.usage;
          const choice = chunk.choices[0];
          if (!choice) continue;
          const delta = choice.delta.content;
          if (delta) {
            text += delta;
            options.onText?.(delta);
          }
          if (choice.finish_reason) finish = choice.finish_reason;
        }
      } catch (err) {
        if (signal?.aborted) throw abortError();
        throw toWebLlmError(err);
      } finally {
        signal?.removeEventListener('abort', interrupt);
      }
      if (signal?.aborted || finish === 'abort') throw abortError();

      if (usage?.extra) {
        options.onStats?.({
          decodeTokensPerSecond: usage.extra.decode_tokens_per_s,
          prefillTokensPerSecond: usage.extra.prefill_tokens_per_s,
          timeToFirstTokenSeconds: usage.extra.time_to_first_token_s,
        });
      }
      return fromWebLlmStream(text, finish, usage, model, performance.now() - started);
    },
  };
}

/** Maps provider-neutral messages onto the chat format. Exported for tests. */
export function toWebLlmMessages(req: Pick<LlmRequest, 'system' | 'messages' | 'tools'>) {
  if (req.tools?.length) {
    throw new LlmProviderError('bad_request', 'The local model is used without tools');
  }
  const out: WebLlmChatMessage[] = [];
  if (req.system !== undefined) out.push({ role: 'system', content: req.system });
  for (const m of req.messages) out.push(toChatMessage(m));
  return out;
}

function toChatMessage(m: LlmMessage): WebLlmChatMessage {
  if (m.role === 'tool' || (m.role === 'assistant' && m.toolCalls?.length)) {
    throw new LlmProviderError('bad_request', 'The local model is used without tools');
  }
  return { role: m.role, content: m.content };
}

const STOP_REASONS: Record<'stop' | 'length', StopReason> = { stop: 'stop', length: 'max_tokens' };

export function fromWebLlmStream(
  text: string,
  finish: WebLlmChunk['choices'][number]['finish_reason'],
  usage: WebLlmChunk['usage'],
  model: string,
  latencyMs: number,
): LlmResponse {
  if (finish !== 'stop' && finish !== 'length') {
    throw new LlmProviderError('unknown', `Unexpected finish reason "${String(finish)}"`);
  }
  return {
    content: stripThinking(text),
    toolCalls: [],
    stopReason: STOP_REASONS[finish],
    usage: {
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
    },
    latencyMs: Math.round(latencyMs),
    model,
    provider: 'webllm',
  };
}

/**
 * Removes a leading `<think>…</think>` block. Qwen3 models think by default; the web app turns
 * that off (`enable_thinking: false`), this only guards the displayed answer.
 */
export function stripThinking(text: string): string {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith('<think>')) return text;
  const end = trimmed.indexOf('</think>');
  return end < 0 ? '' : trimmed.slice(end + '</think>'.length).trimStart();
}

/** Errors from a worker engine arrive as plain strings, not Error instances. */
export function toWebLlmError(err: unknown): LlmProviderError {
  if (err instanceof LlmProviderError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new LlmProviderError('unknown', message);
}

function abortError() {
  return new DOMException('Aborted', 'AbortError');
}
