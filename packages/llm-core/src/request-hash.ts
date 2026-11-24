import type { LlmMessage, LlmRequest } from './types.ts';

/**
 * The part of a request that determines the model's answer: system prompt, messages, tools and
 * token limit. `context` (replay lookup) and `providerState` (opaque provider data) are left out,
 * so a replayed run produces the same value as the recorded one.
 */
export function canonicalRequest(req: LlmRequest): unknown {
  return {
    system: req.system,
    messages: req.messages.map(stripProviderState),
    tools: req.tools,
    maxTokens: req.maxTokens,
  };
}

export function stripProviderState(message: LlmMessage): LlmMessage {
  if (message.role !== 'assistant' || message.providerState === undefined) return message;
  const { providerState: _omitted, ...rest } = message;
  return rest;
}

/** JSON with object keys sorted at every level; `undefined` values are dropped like in JSON.stringify. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/**
 * SHA-256 (hex) of the canonical request. A recording stores it for every step; replay compares it
 * to detect that the code now sends something else than what the model answered. It is a drift
 * check, not tamper protection: anyone who edits a recording can recompute it.
 */
export async function hashRequest(req: LlmRequest): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(canonicalRequest(req)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
