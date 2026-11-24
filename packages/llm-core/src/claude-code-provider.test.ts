import { describe, expect, it } from 'vitest';
import {
  claudeCodeArgs,
  claudeCodeTranscript,
  createClaudeCodeProvider,
  parseClaudeCodeResult,
  type ClaudeCodeExec,
} from './claude-code-provider.ts';
import { LlmProviderError, type LlmRequest } from './types.ts';

const request: LlmRequest = {
  system: 'Jsi asistent.',
  messages: [
    { role: 'user', content: 'Najdi fondy.' },
    {
      role: 'assistant',
      content: '',
      toolCalls: [{ id: 'cc_0_0', name: 'search_funds', arguments: { query: 'fond' } }],
      providerState: { secret: 'never sent' },
    },
    { role: 'tool', toolCallId: 'cc_0_0', content: '[]' },
  ],
  tools: [{ name: 'search_funds', description: 'Hledá fondy.', inputSchema: { type: 'object' } }],
};

/** Shape of `claude -p --output-format json`, trimmed to the fields the provider reads. */
function cliResult(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    type: 'result',
    subtype: 'success',
    is_error: false,
    stop_reason: 'tool_use',
    duration_ms: 2103,
    structured_output: { content: 'Hotovo.', toolCalls: [] },
    modelUsage: {
      'claude-haiku-5-5': { inputTokens: 1179, outputTokens: 19 },
      'claude-sonnet-5-5': {
        inputTokens: 2,
        outputTokens: 54,
        cacheReadInputTokens: 10,
        cacheCreationInputTokens: 1478,
      },
    },
    ...overrides,
  });
}

const parse = (stdout: string) =>
  parseClaudeCodeResult(stdout, { requestedModel: 'claude-sonnet-5-5', turn: 1 });

describe('createClaudeCodeProvider', () => {
  it('runs one isolated CLI session per call with our system prompt and the transcript', async () => {
    const calls: { args: readonly string[]; stdin: string }[] = [];
    const exec: ClaudeCodeExec = (args, stdin) => {
      calls.push({ args, stdin });
      return Promise.resolve(cliResult());
    };
    const provider = createClaudeCodeProvider({
      model: 'claude-sonnet-5-5',
      effort: 'medium',
      exec,
    });
    const res = await provider.complete(request);

    expect(res).toMatchObject({ content: 'Hotovo.', stopReason: 'stop', provider: 'claude-code' });
    const { args, stdin } = calls[0]!;
    const flag = (name: string) => args[args.indexOf(name) + 1];
    expect(flag('--model')).toBe('claude-sonnet-5-5');
    expect(flag('--effort')).toBe('medium');
    expect(flag('--tools')).toBe('');
    expect(flag('--setting-sources')).toBe('');
    expect(args).toContain('--strict-mcp-config');
    expect(args).toContain('--no-session-persistence');
    expect(flag('--system-prompt')).toMatch(/^Jsi asistent\.\n[\s\S]*"name": "search_funds"/);
    expect(JSON.parse(flag('--json-schema')!)).toMatchObject({
      properties: { toolCalls: { items: { properties: { name: { enum: ['search_funds'] } } } } },
    });
    // Provider state stays in memory.
    expect(stdin).not.toContain('never sent');
    expect(JSON.parse(stdin)).toHaveLength(3);
  });
});

describe('parseClaudeCodeResult', () => {
  it('reads tool calls, gives them stable ids and counts cache tokens as input', () => {
    const res = parse(
      cliResult({
        structured_output: {
          content: '',
          toolCalls: [{ name: 'calculate_fees', arguments: { fundId: 'alfa' } }],
        },
      }),
    );
    expect(res.toolCalls).toEqual([
      { id: 'cc_1_0', name: 'calculate_fees', arguments: { fundId: 'alfa' } },
    ]);
    expect(res.stopReason).toBe('tool_use');
    expect(res.model).toBe('claude-sonnet-5-5');
    expect(res.usage).toEqual({ inputTokens: 1490, outputTokens: 54 });
    expect(res.latencyMs).toBe(2103);
  });

  it('reports the model that produced most output when the requested one did not serve', () => {
    const res = parse(
      cliResult({
        modelUsage: {
          'claude-haiku-5-5': { inputTokens: 900, outputTokens: 10 },
          'claude-opus-5-5': { inputTokens: 1500, outputTokens: 80 },
        },
      }),
    );
    expect(res.model).toBe('claude-opus-5-5');
  });

  it('maps a refusal and CLI errors', () => {
    expect(
      parse(cliResult({ stop_reason: 'refusal', structured_output: undefined })),
    ).toMatchObject({ stopReason: 'refusal', content: '', toolCalls: [] });
    const error = (() => {
      try {
        parse(
          cliResult({ is_error: true, subtype: 'error_during_execution', api_error_status: 429 }),
        );
      } catch (err) {
        return err;
      }
    })();
    expect(error).toBeInstanceOf(LlmProviderError);
    expect(error).toMatchObject({ code: 'rate_limit', status: 429 });
    expect(() => parse('not json')).toThrow(LlmProviderError);
    expect(() => parse(cliResult({ structured_output: { content: 1 } }))).toThrow(
      /no structured output/,
    );
  });

  it('serialises the transcript without provider state', () => {
    expect(JSON.parse(claudeCodeTranscript(request.messages))).toEqual([
      { role: 'user', content: 'Najdi fondy.' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [{ id: 'cc_0_0', name: 'search_funds', arguments: { query: 'fond' } }],
      },
      { role: 'tool', toolCallId: 'cc_0_0', isError: false, content: '[]' },
    ]);
    expect(claudeCodeArgs({ messages: [] }, { model: 'm' })).not.toContain('--effort');
  });
});
