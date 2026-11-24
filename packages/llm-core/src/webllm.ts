/**
 * Separate entry point (`@trusted-ai-lab/llm-core/webllm`), loaded by the web app together with
 * WebLLM itself only after the visitor asks for the local model.
 */
export {
  createWebLlmProvider,
  fromWebLlmStream,
  stripThinking,
  toWebLlmError,
  toWebLlmMessages,
  type WebLlmChatMessage,
  type WebLlmChunk,
  type WebLlmEngine,
  type WebLlmProviderOptions,
  type WebLlmStats,
  type WebLlmStreamingRequest,
} from './webllm-provider.ts';
