/**
 * agent-runtime — own agent loop (no framework) with the policy engine as a separate layer.
 *
 *   const result = await runAgent({
 *     provider,                       // any LlmProvider: replay, BYOK, …
 *     log: createTraceLog(),          // every model call, tool call and policy decision
 *     funds, persona: 'klient', guardrails: true,
 *     userMessage, approve,           // approve = the human in the loop
 *     scenario: runKey('s1-bezny-dotaz', true),
 *   });
 *
 * With `guardrails: false` the same loop runs with the same prompt but without the policy layer.
 */
export * from './config.ts';
export * from './funds.ts';
export * from './tools/index.ts';
export { ANSWERS, QUARANTINED, REASONS } from './messages.ts';
export { PROMPT_VERSION, systemPrompt } from './prompt.ts';
export { isAdviceAnswer, isAdviceRequest } from './policy/advice.ts';
export { INJECTION_PATTERNS, detectInjection, type InjectionPattern } from './policy/injection.ts';
export { createPiiGuard, type PiiGuard } from './policy/pii.ts';
export {
  createGuardrails,
  createPassthroughPolicy,
  wrapUntrusted,
  type ApprovalDecision,
  type ApprovalOutcome,
  type ApprovalRequest,
  type Approver,
  type DecidedBy,
  type Policy,
} from './policy/engine.ts';
export { runAgent, type AgentRunResult, type RunAgentOptions, type RunStatus } from './loop.ts';
export * from './scenarios.ts';
export * from './recording.ts';

export const VERSION = '0.1.0';
