import { describe, expect, it } from 'vitest';
import {
  FALLBACK_BETA,
  createAnthropicProvider,
  type AnthropicProviderOptions,
} from './anthropic-provider.ts';
import { LlmProviderError, type LlmRequest } from './types.ts';

const KEY = 'test-key-not-real';

interface Captured {
  url: string;
  headers: Headers;
  body: Record<string, unknown>;
}

function fakeFetch(status: number, body: unknown, captured: Captured[] = []): typeof fetch {
  return (input, init) => {
    const request = new Request(input, init);
    return request.text().then((text) => {
      captured.push({
        url: request.url,
        headers: request.headers,
        body: JSON.parse(text) as Record<string, unknown>,
      });
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json', 'request-id': 'req_test_123' },
      });
    });
  };
}

const okMessage = {
  id: 'msg_1',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-5-5',
  content: [
    { type: 'thinking', thinking: '', signature: 'sig-abc' },
    { type: 'text', text: 'Hledám fondy.' },
    { type: 'tool_use', id: 'toolu_1', name: 'search_funds', input: { query: 'dluhopisy' } },
  ],
  stop_reason: 'tool_use',
  stop_sequence: null,
  usage: {
    input_tokens: 1000,
    output_tokens: 200,
    cache_creation_input_tokens: 10,
    cache_read_input_tokens: 5,
  },
};

const request: LlmRequest = {
  system: 'Jsi asistent pro fiktivní fondy.',
  maxTokens: 8000,
  tools: [
    { name: 'search_funds', description: 'Hledá fondy', inputSchema: { type: 'object' } },
    { name: 'calculate_fees', description: 'Počítá poplatky', inputSchema: { type: 'object' } },
  ],
  messages: [
    { role: 'user', content: 'Najdi dluhopisové fondy' },
    {
      role: 'assistant',
      content: '',
      toolCalls: [
        { id: 'a', name: 'search_funds', arguments: {} },
        { id: 'b', name: 'calculate_fees', arguments: {} },
      ],
      providerState: [
        { type: 'thinking', thinking: '', signature: 'sig-previous' },
        { type: 'tool_use', id: 'a', name: 'search_funds', input: {} },
        { type: 'tool_use', id: 'b', name: 'calculate_fees', input: {} },
      ],
    },
    { role: 'tool', toolCallId: 'a', content: '[]' },
    { role: 'tool', toolCallId: 'b', content: 'Neznámý fond', isError: true },
  ],
};

const options = (extra: Partial<AnthropicProviderOptions> = {}): AnthropicProviderOptions => ({
  model: 'claude-sonnet-5-5',
  browser: false,
  apiKey: KEY,
  effort: 'medium',
  fallbacks: 'default',
  maxRetries: 0,
  ...extra,
});

describe('createAnthropicProvider', () => {
  it('sends the Messages API shape: top-level system, merged tool results, effort, fallbacks', async () => {
    const captured: Captured[] = [];
    const provider = createAnthropicProvider(
      options({ fetch: fakeFetch(200, okMessage, captured) }),
    );
    await provider.complete(request);

    const [call] = captured;
    expect(call?.url).toContain('/v1/messages');
    expect(call?.body).toMatchObject({
      model: 'claude-sonnet-5-5',
      max_tokens: 8000,
      system: request.system,
      output_config: { effort: 'medium' },
      fallbacks: 'default',
      tools: [
        { name: 'search_funds', description: 'Hledá fondy', input_schema: { type: 'object' } },
        {
          name: 'calculate_fees',
          description: 'Počítá poplatky',
          input_schema: { type: 'object' },
        },
      ],
    });
    expect(call?.body).not.toHaveProperty('temperature');
    expect(call?.headers.get('anthropic-beta')).toContain(FALLBACK_BETA);

    const messages = call?.body.messages as { role: string; content: unknown }[];
    expect(messages).toHaveLength(3);
    // The assistant turn goes back exactly as returned, thinking signature included.
    const assistant = request.messages[1];
    expect(assistant?.role === 'assistant' && messages[1]?.content).toEqual(
      assistant?.role === 'assistant' && assistant.providerState,
    );
    // Both results of one turn in a single user message.
    expect(messages[2]).toEqual({
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 'a', content: '[]' },
        { type: 'tool_result', tool_use_id: 'b', content: 'Neznámý fond', is_error: true },
      ],
    });
  });

  it('maps the response by block type and keeps the raw content as providerState', async () => {
    const provider = createAnthropicProvider(options({ fetch: fakeFetch(200, okMessage) }));
    const res = await provider.complete(request);
    expect(res).toMatchObject({
      content: 'Hledám fondy.',
      toolCalls: [{ id: 'toolu_1', name: 'search_funds', arguments: { query: 'dluhopisy' } }],
      stopReason: 'tool_use',
      usage: { inputTokens: 1015, outputTokens: 200 },
      model: 'claude-sonnet-5-5',
      provider: 'byok-anthropic',
      requestId: 'req_test_123',
    });
    expect(res.providerState).toEqual(okMessage.content);
    expect(res.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('builds assistant blocks from text and tool calls when there is no providerState', async () => {
    const captured: Captured[] = [];
    const provider = createAnthropicProvider(
      options({ fetch: fakeFetch(200, okMessage, captured) }),
    );
    await provider.complete({
      messages: [
        { role: 'user', content: 'Ahoj' },
        {
          role: 'assistant',
          content: 'Hledám.',
          toolCalls: [{ id: 'x', name: 'search_funds', arguments: { query: 'a' } }],
        },
        { role: 'tool', toolCallId: 'x', content: '[]' },
      ],
    });
    const messages = captured[0]?.body.messages as { content: unknown }[];
    expect(messages[1]?.content).toEqual([
      { type: 'text', text: 'Hledám.' },
      { type: 'tool_use', id: 'x', name: 'search_funds', input: { query: 'a' } },
    ]);
  });

  it('maps a refusal stop reason', async () => {
    const provider = createAnthropicProvider(
      options({
        fetch: fakeFetch(200, { ...okMessage, content: [], stop_reason: 'refusal' }),
      }),
    );
    await expect(provider.complete(request)).resolves.toMatchObject({ stopReason: 'refusal' });
  });

  it('omits fallbacks and the beta header when not configured', async () => {
    const captured: Captured[] = [];
    const provider = createAnthropicProvider(
      options({ fallbacks: undefined, fetch: fakeFetch(200, okMessage, captured) }),
    );
    await provider.complete(request);
    expect(captured[0]?.body).not.toHaveProperty('fallbacks');
    expect(captured[0]?.headers.get('anthropic-beta')).toBeNull();
  });

  it('sends the direct-browser-access header only in browser mode', async () => {
    const browser: Captured[] = [];
    const server: Captured[] = [];
    await createAnthropicProvider(
      options({ browser: true, fetch: fakeFetch(200, okMessage, browser) }),
    ).complete(request);
    await createAnthropicProvider(
      options({ browser: false, fetch: fakeFetch(200, okMessage, server) }),
    ).complete(request);
    expect(browser[0]?.headers.get('anthropic-dangerous-direct-browser-access')).toBe('true');
    expect(server[0]?.headers.get('anthropic-dangerous-direct-browser-access')).toBeNull();
  });

  it('refuses to run in the browser without an explicit key', () => {
    expect(() => createAnthropicProvider(options({ browser: true, apiKey: undefined }))).toThrow(
      LlmProviderError,
    );
  });

  it.each([
    [401, 'authentication_error', 'invalid x-api-key', 'auth'],
    [
      401,
      'authentication_error',
      'CORS requests are not allowed for this Organization because of its settings.',
      'cors_forbidden',
    ],
    [403, 'permission_error', 'not allowed', 'permission'],
    [429, 'rate_limit_error', 'slow down', 'rate_limit'],
    [400, 'invalid_request_error', 'bad tool schema', 'bad_request'],
    [500, 'api_error', 'internal', 'server'],
  ])('maps HTTP %i (%s) to code %s', async (status, type, message, code) => {
    const provider = createAnthropicProvider(
      options({ fetch: fakeFetch(status, { type: 'error', error: { type, message } }) }),
    );
    const error = await provider.complete(request).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LlmProviderError);
    expect(error).toMatchObject({ code, status });
    expect(String((error as Error).message)).not.toContain(KEY);
  });

  it('maps a network failure to code network', async () => {
    const provider = createAnthropicProvider(
      options({ fetch: () => Promise.reject(new TypeError('Failed to fetch')) }),
    );
    await expect(provider.complete(request)).rejects.toMatchObject({ code: 'network' });
  });

  it('rejects with AbortError when the signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = createAnthropicProvider(options({ fetch: fakeFetch(200, okMessage) }));
    await expect(provider.complete(request, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('fails clearly on an unexpected stop reason', async () => {
    const provider = createAnthropicProvider(
      options({ fetch: fakeFetch(200, { ...okMessage, stop_reason: 'pause_turn' }) }),
    );
    await expect(provider.complete(request)).rejects.toMatchObject({ code: 'unknown' });
  });
});
