import { describe, expect, it } from 'vitest';
import { canonicalJson, canonicalRequest, hashRequest } from './request-hash.ts';
import type { LlmRequest } from './types.ts';

const base: LlmRequest = {
  system: 'Jsi asistent.',
  messages: [
    { role: 'user', content: 'Najdi fondy' },
    {
      role: 'assistant',
      content: '',
      toolCalls: [{ id: 'c1', name: 'search_funds', arguments: { query: 'akcie', filters: {} } }],
      providerState: [{ type: 'thinking', signature: 'opaque' }],
    },
    { role: 'tool', toolCallId: 'c1', content: '[]' },
  ],
  tools: [{ name: 'search_funds', description: 'Hledá fondy', inputSchema: { type: 'object' } }],
  maxTokens: 4000,
  context: { scenario: 's1', step: 1, promptVersion: 'v1' },
};

describe('canonicalJson', () => {
  it('sorts keys at every level and drops undefined values', () => {
    expect(canonicalJson({ b: 1, a: { d: undefined, c: [{ z: 1, y: 2 }] } })).toBe(
      '{"a":{"c":[{"y":2,"z":1}]},"b":1}',
    );
  });
});

describe('hashRequest', () => {
  it('is a 64-character hex SHA-256', async () => {
    expect(await hashRequest(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('does not depend on key order, context or providerState', async () => {
    const reordered: LlmRequest = {
      context: { scenario: 'other', step: 9 },
      maxTokens: 4000,
      tools: base.tools,
      messages: base.messages.map((m) =>
        m.role === 'assistant' ? { ...m, providerState: 'different' } : m,
      ),
      system: base.system,
    };
    expect(await hashRequest(reordered)).toBe(await hashRequest(base));
  });

  it.each([
    ['system prompt', { system: 'Jiný prompt' }],
    ['tools', { tools: [] }],
    ['max tokens', { maxTokens: 100 }],
    ['messages', { messages: base.messages.slice(0, 1) }],
  ])('changes when the %s changes', async (_label, patch) => {
    expect(await hashRequest({ ...base, ...patch })).not.toBe(await hashRequest(base));
  });

  it('keeps everything the model sees in the canonical form', () => {
    expect(canonicalRequest(base)).toMatchObject({
      system: base.system,
      maxTokens: 4000,
      tools: base.tools,
    });
    expect(JSON.stringify(canonicalRequest(base))).not.toContain('opaque');
  });
});
