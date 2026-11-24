import { z } from 'zod';

/**
 * Every LLM backend the demo can use. Implemented: `replay`, `byok-anthropic` (Messages API) and
 * `claude-code` (headless Claude Code CLI, used only by the recording script).
 */
export const ProviderIdSchema = z.enum([
  'replay',
  'byok-anthropic',
  'byok-openai',
  'webllm',
  'claude-code',
]);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const ToolCallSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Untrusted model output — must be validated before the tool runs. */
  arguments: z.unknown(),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

export const UserMessageSchema = z.object({
  role: z.literal('user'),
  content: z.string(),
});

export const AssistantMessageSchema = z.object({
  role: z.literal('assistant'),
  content: z.string(),
  toolCalls: z.array(ToolCallSchema).optional(),
  /**
   * Provider-native content of this turn (e.g. Anthropic thinking blocks with signatures).
   * Providers must send it back unchanged; it is never traced, recorded or hashed.
   */
  providerState: z.unknown().optional(),
});

export const ToolMessageSchema = z.object({
  role: z.literal('tool'),
  /** Links the result to the tool call it answers. */
  toolCallId: z.string().min(1),
  content: z.string(),
  isError: z.boolean().optional(),
});

/** One turn of the conversation. The system prompt is `LlmRequest.system`, not a message. */
export const LlmMessageSchema = z.discriminatedUnion('role', [
  UserMessageSchema,
  AssistantMessageSchema,
  ToolMessageSchema,
]);
export type LlmMessage = z.infer<typeof LlmMessageSchema>;
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;
export type ToolMessage = z.infer<typeof ToolMessageSchema>;

export const ToolDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  /** JSON Schema of the tool input (generated from a zod schema by the caller). */
  inputSchema: z.record(z.string(), z.unknown()),
});
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

export const LlmUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
});
export type LlmUsage = z.infer<typeof LlmUsageSchema>;

/** Provider-neutral stop reasons; each provider maps its own values onto these. */
export const StopReasonSchema = z.enum(['stop', 'tool_use', 'max_tokens', 'refusal']);
export type StopReason = z.infer<typeof StopReasonSchema>;

export const LlmResponseSchema = z.object({
  content: z.string(),
  toolCalls: z.array(ToolCallSchema),
  stopReason: StopReasonSchema,
  usage: LlmUsageSchema,
  /** Latency reported by the provider. For `replay` this is the latency measured at recording time. */
  latencyMs: z.number().nonnegative(),
  /** Model that actually served the response (may differ from the requested one after a fallback). */
  model: z.string().min(1),
  provider: ProviderIdSchema,
  /** Provider request id (Anthropic `request-id`), evidence that a real API call happened. */
  requestId: z.string().min(1).optional(),
  /** See `AssistantMessage.providerState`. In memory only. */
  providerState: z.unknown().optional(),
});
export type LlmResponse = z.infer<typeof LlmResponseSchema>;

/** Identifies a request within a scenario; used for replay lookup and trace correlation. */
export const RequestContextSchema = z.object({
  scenario: z.string().min(1),
  step: z.number().int().nonnegative(),
  promptVersion: z.string().min(1).optional(),
});
export type RequestContext = z.infer<typeof RequestContextSchema>;

/**
 * Provider-neutral request. There is deliberately no `temperature`: the Anthropic API
 * (version 2026-10-21) rejects sampling parameters.
 */
export interface LlmRequest {
  system?: string;
  messages: LlmMessage[];
  tools?: ToolDefinition[];
  maxTokens?: number;
  context?: RequestContext;
}

export interface LlmProvider {
  readonly id: ProviderId;
  /** Resolves with the response including usage and latency; rejects on abort or provider error. */
  complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResponse>;
}

/** Failure categories a UI can explain without showing raw provider messages. */
export const LLM_ERROR_CODES = [
  'auth',
  'cors_forbidden',
  'permission',
  'rate_limit',
  'bad_request',
  'server',
  'network',
  'timeout',
  'unknown',
] as const;
export type LlmErrorCode = (typeof LLM_ERROR_CODES)[number];

/** Provider error with a stable code. The message never contains credentials. */
export class LlmProviderError extends Error {
  override readonly name = 'LlmProviderError';
  readonly code: LlmErrorCode;
  readonly status: number | undefined;

  constructor(code: LlmErrorCode, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
