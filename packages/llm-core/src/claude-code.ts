/**
 * Separate entry point (`@trusted-ai-lab/llm-core/claude-code`): only the recording script uses it.
 */
export {
  claudeCodeArgs,
  claudeCodeSystemPrompt,
  claudeCodeTranscript,
  createClaudeCodeProvider,
  parseClaudeCodeResult,
  type ClaudeCodeExec,
  type ClaudeCodeProviderOptions,
} from './claude-code-provider.ts';
