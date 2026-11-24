import { AGENT_EFFORT, AGENT_MAX_TOKENS, AGENT_MODEL } from '@trusted-ai-lab/agent-runtime';
import type { LlmProvider } from '@trusted-ai-lab/llm-core';

/**
 * Loads the Anthropic SDK only when the visitor starts a BYOK run (separate chunk, never part of
 * the initial bundle). The key stays inside the returned provider; callers drop the provider to
 * forget it.
 */
export async function createByokProvider(apiKey: string): Promise<LlmProvider> {
  const { createAnthropicProvider } = await import('@trusted-ai-lab/llm-core/anthropic');
  return createAnthropicProvider({
    model: AGENT_MODEL,
    browser: true,
    apiKey,
    effort: AGENT_EFFORT,
    maxTokens: AGENT_MAX_TOKENS,
    fallbacks: 'default',
  });
}
