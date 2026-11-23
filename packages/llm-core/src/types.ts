import { z } from 'zod';

/** Every LLM backend the demo can use. Only `replay` is implemented in phase 0. */
export const ProviderIdSchema = z.enum(['replay', 'byok-anthropic', 'byok-openai', 'webllm']);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const LlmMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  /** Links a `tool` message to the tool call it answers. */
  toolCallId: z.string().min(1).optional(),
});
export type LlmMessage = z.infer<typeof LlmMessageSchema>;

export const ToolDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  /** JSON Schema of the tool input (generated from a zod schema by the caller). */
  inputSchema: z.record(z.string(), z.unknown()),
});
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

export const ToolCallSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Untrusted model output — must be validated before the tool runs. */
  arguments: z.unknown(),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

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
  model: z.string().min(1),
  provider: ProviderIdSchema,
});
export type LlmResponse = z.infer<typeof LlmResponseSchema>;

/** Identifies a request within a scenario; used for replay lookup and trace correlation. */
export const RequestContextSchema = z.object({
  scenario: z.string().min(1),
  step: z.number().int().nonnegative(),
  promptVersion: z.string().min(1).optional(),
});
export type RequestContext = z.infer<typeof RequestContextSchema>;

export interface LlmRequest {
  messages: LlmMessage[];
  tools?: ToolDefinition[];
  maxTokens?: number;
  temperature?: number;
  context?: RequestContext;
}

export interface LlmProvider {
  readonly id: ProviderId;
  /** Resolves with the response including usage and latency; rejects on abort or provider error. */
  complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResponse>;
}
