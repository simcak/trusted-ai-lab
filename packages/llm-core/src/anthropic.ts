/**
 * Separate entry point (`@trusted-ai-lab/llm-core/anthropic`) so the Anthropic SDK is only bundled
 * where it is imported: the recording script and the lazily loaded BYOK chunk of the web app.
 */
export {
  FALLBACK_BETA,
  createAnthropicProvider,
  fromAnthropicMessage,
  toAnthropicMessages,
  toProviderError,
  type AnthropicEffort,
  type AnthropicProviderOptions,
} from './anthropic-provider.ts';
