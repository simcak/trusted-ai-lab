import { z } from 'zod';
import {
  LlmProviderError,
  type LlmMessage,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
} from './types.ts';

/**
 * Runs the Claude Code CLI once and resolves with its stdout. Injected so this module stays free
 * of Node APIs; the recording script spawns the real binary.
 */
export type ClaudeCodeExec = (
  args: readonly string[],
  stdin: string,
  signal?: AbortSignal,
) => Promise<string>;

export interface ClaudeCodeProviderOptions {
  /** Exact model id, e.g. `claude-sonnet-5-5`. */
  model: string;
  effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  exec: ClaudeCodeExec;
}

/**
 * `LlmProvider` over headless Claude Code (`claude -p`), for recording with a Claude subscription
 * instead of an API key. Every call is a fresh session without built-in tools, MCP servers,
 * settings or slash commands; the system prompt is replaced by ours.
 *
 * It is a different transport from the Messages API: the model gets the conversation as JSON in
 * one user message and calls tools through the CLI's structured output, not through native tool
 * use. Recordings made this way say so (`provider: 'claude-code'`).
 */
export function createClaudeCodeProvider(options: ClaudeCodeProviderOptions): LlmProvider {
  return {
    id: 'claude-code',
    async complete(req, signal) {
      const stdout = await options.exec(
        claudeCodeArgs(req, options),
        claudeCodeTranscript(req.messages),
        signal,
      );
      return parseClaudeCodeResult(stdout, {
        requestedModel: options.model,
        turn: req.messages.filter((m) => m.role === 'assistant').length,
      });
    },
  };
}

/** CLI arguments for one model call. Exported for tests. */
export function claudeCodeArgs(
  req: LlmRequest,
  options: Pick<ClaudeCodeProviderOptions, 'model' | 'effort'>,
): string[] {
  return [
    '-p',
    '--model',
    options.model,
    ...(options.effort ? ['--effort', options.effort] : []),
    '--output-format',
    'json',
    '--json-schema',
    JSON.stringify(outputSchema((req.tools ?? []).map((t) => t.name))),
    '--system-prompt',
    claudeCodeSystemPrompt(req),
    '--tools',
    '',
    '--strict-mcp-config',
    '--setting-sources',
    '',
    '--disable-slash-commands',
    '--no-session-persistence',
  ];
}

/** Our system prompt plus the transport rules and the tool list. Exported for tests. */
export function claudeCodeSystemPrompt(req: LlmRequest): string {
  const tools = (req.tools ?? []).map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
  return [
    req.system ?? '',
    '',
    '## Transport',
    'You are the assistant in the conversation that the user message contains as JSON (oldest first).',
    'All tools listed below are available to you and work normally in this conversation. You call',
    'them only by listing them in "toolCalls" of the structured output; there is no other way.',
    'The structured output (StructuredOutput) carries one assistant turn, not the end of the task:',
    'when "toolCalls" is not empty, the application runs those tools and you get their results in',
    'the next message.',
    'Reply with the next assistant turn only, through the structured output:',
    '- "toolCalls": tools to call now, each with "name" and "arguments" (an object matching the',
    '  tool input schema). An empty array when you are not calling a tool.',
    '- "content": text for the user. When "toolCalls" is empty, it is your final answer.',
    'The application runs the tools and adds their results as messages with role "tool".',
    '',
    'Tools:',
    JSON.stringify(tools, null, 2),
  ].join('\n');
}

/** The conversation as the model sees it, without provider state. Exported for tests. */
export function claudeCodeTranscript(messages: readonly LlmMessage[]): string {
  return JSON.stringify(
    messages.map((m) => {
      switch (m.role) {
        case 'user':
          return { role: m.role, content: m.content };
        case 'assistant':
          return { role: m.role, content: m.content, toolCalls: m.toolCalls ?? [] };
        case 'tool':
          return {
            role: m.role,
            toolCallId: m.toolCallId,
            isError: m.isError ?? false,
            content: m.content,
          };
      }
    }),
    null,
    2,
  );
}

function outputSchema(toolNames: readonly string[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['content', 'toolCalls'],
    properties: {
      content: { type: 'string' },
      toolCalls:
        toolNames.length === 0
          ? { type: 'array', maxItems: 0 }
          : {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'arguments'],
                properties: {
                  name: { type: 'string', enum: toolNames },
                  arguments: { type: 'object' },
                },
              },
            },
    },
  };
}

const ModelUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadInputTokens: z.number().default(0),
  cacheCreationInputTokens: z.number().default(0),
});

const ResultSchema = z.looseObject({
  type: z.literal('result'),
  subtype: z.string(),
  is_error: z.boolean(),
  stop_reason: z.string().nullish(),
  duration_ms: z.number().nonnegative(),
  structured_output: z.unknown().optional(),
  api_error_status: z.number().nullish(),
  modelUsage: z.record(z.string(), ModelUsageSchema).default({}),
});

const TurnSchema = z.object({
  content: z.string(),
  toolCalls: z.array(z.object({ name: z.string().min(1), arguments: z.unknown() })),
});

function errorCode(status: number | null | undefined) {
  if (status === 401) return 'auth' as const;
  if (status === 403) return 'permission' as const;
  if (status === 429) return 'rate_limit' as const;
  if (status !== null && status !== undefined && status >= 500) return 'server' as const;
  return 'unknown' as const;
}

/** Maps the CLI's `--output-format json` result onto `LlmResponse`. Exported for tests. */
export function parseClaudeCodeResult(
  stdout: string,
  { requestedModel, turn }: { requestedModel: string; turn: number },
): LlmResponse {
  let result: z.infer<typeof ResultSchema>;
  try {
    result = ResultSchema.parse(JSON.parse(stdout));
  } catch {
    throw new LlmProviderError('unknown', 'Claude Code returned an unexpected result');
  }
  if (result.is_error) {
    throw new LlmProviderError(
      errorCode(result.api_error_status),
      `Claude Code failed (${result.subtype})`,
      result.api_error_status ?? undefined,
    );
  }

  // Claude Code also makes small side calls with another model; the served model is the requested
  // one, or after a fallback the one that produced the most output.
  const entries = Object.entries(result.modelUsage);
  const served =
    entries.find(([name]) => name === requestedModel) ??
    entries.sort(([, a], [, b]) => b.outputTokens - a.outputTokens)[0];
  if (!served) throw new LlmProviderError('unknown', 'Claude Code reported no model usage');
  const [model, u] = served;
  const base = {
    usage: {
      inputTokens: u.inputTokens + u.cacheReadInputTokens + u.cacheCreationInputTokens,
      outputTokens: u.outputTokens,
    },
    latencyMs: Math.round(result.duration_ms),
    model,
    provider: 'claude-code' as const,
  };

  if (result.stop_reason === 'refusal') {
    return { ...base, content: '', toolCalls: [], stopReason: 'refusal' };
  }
  const parsed = TurnSchema.safeParse(result.structured_output);
  if (!parsed.success) {
    throw new LlmProviderError('unknown', 'Claude Code returned no structured output');
  }
  const toolCalls = parsed.data.toolCalls.map((call, i) => ({
    id: `cc_${turn}_${i}`,
    name: call.name,
    arguments: call.arguments,
  }));
  return {
    ...base,
    content: parsed.data.content,
    toolCalls,
    stopReason:
      result.stop_reason === 'max_tokens' ? 'max_tokens' : toolCalls.length ? 'tool_use' : 'stop',
  };
}
