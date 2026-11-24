import {
  withTracing,
  type LlmMessage,
  type LlmProvider,
  type LlmUsage,
  type TraceLog,
} from '@trusted-ai-lab/llm-core';
import {
  AGENT_MAX_TOKENS,
  DEFAULT_POLICY,
  HARD_MAX_MODEL_CALLS,
  type Persona,
  type PolicyConfig,
  type RuleId,
} from './config.ts';
import type { Fund } from './funds.ts';
import { ANSWERS } from './messages.ts';
import {
  createGuardrails,
  createPassthroughPolicy,
  type Approver,
  type Policy,
} from './policy/engine.ts';
import { PROMPT_VERSION, systemPrompt } from './prompt.ts';
import { createToolbox, type EmailDraft, type ToolFaults } from './tools/index.ts';

export type RunStatus =
  /** The model answered. */
  | 'completed'
  /** The policy answered instead of the model (e.g. investment advice). */
  | 'refused_by_policy'
  /** The policy ended the run safely (budget, loop). */
  | 'stopped_by_policy'
  /** The runtime's hard cap — reached only when the policy layer is off. */
  | 'step_limit'
  | 'model_refusal'
  | 'max_tokens';

export interface AgentRunResult {
  status: RunStatus;
  /** As the user sees it (re-identified locally). */
  answer: string;
  stoppedBy?: RuleId;
  /** Drafts that were created. They are never sent. */
  drafts: EmailDraft[];
  modelCalls: number;
  usage: LlmUsage;
}

export interface RunAgentOptions {
  provider: LlmProvider;
  log: TraceLog;
  funds: readonly Fund[];
  persona: Persona;
  guardrails: boolean;
  userMessage: string;
  approve: Approver;
  /** Trace and replay key, e.g. `s4-rodne-cislo/on`. */
  scenario: string;
  faults?: ToolFaults;
  policy?: PolicyConfig;
  /** Reference date for PII detection (birth dates in rodné číslo); fixed in replays. */
  today?: Date;
  signal?: AbortSignal;
}

/**
 * The agent loop: no framework, no hidden calls. Ask the model, run the tools it asks for, repeat —
 * at most HARD_MAX_MODEL_CALLS times. Every model call is traced; the policy layer (or its
 * pass-through twin when guardrails are off) decides at fixed points.
 *
 * The history sent to the model is append-only and kept in its pseudonymised form: earlier
 * messages, the system prompt and the tool list never change during a run.
 */
export async function runAgent(options: RunAgentOptions): Promise<AgentRunResult> {
  const { log, scenario, persona, guardrails, signal } = options;
  const config = options.policy ?? DEFAULT_POLICY;
  const provider = withTracing(options.provider, log, { input: 'delta' });
  const policy: Policy = guardrails
    ? createGuardrails({ log, scenario, persona, config, today: options.today ?? new Date() })
    : createPassthroughPolicy();
  const toolbox = createToolbox(options.funds, options.faults);
  const usage: LlmUsage = { inputTokens: 0, outputTokens: 0 };
  const drafts: EmailDraft[] = [];
  let modelCalls = 0;

  log.emit({
    type: 'info',
    name: 'run_start',
    scenario,
    input: {
      persona,
      guardrails,
      promptVersion: PROMPT_VERSION,
      ...(guardrails && { policy: config }),
    },
  });

  const finish = (status: RunStatus, answer: string, stoppedBy?: RuleId): AgentRunResult => {
    log.emit({
      type: 'info',
      name: 'run_end',
      scenario,
      output: { status, ...(stoppedBy && { stoppedBy }), modelCalls, usage: { ...usage } },
    });
    return {
      status,
      answer,
      ...(stoppedBy && { stoppedBy }),
      drafts,
      modelCalls,
      usage: { ...usage },
    };
  };

  const refused = policy.checkInput(options.userMessage);
  if (refused) return finish('refused_by_policy', refused.answer, refused.rule);

  const system = systemPrompt(persona);
  const tools = policy.selectTools(toolbox.definitions);
  const messages: LlmMessage[] = [
    { role: 'user', content: policy.protectInbound(options.userMessage) },
  ];

  for (let step = 0; ; step += 1) {
    signal?.throwIfAborted();
    if (step >= HARD_MAX_MODEL_CALLS) return finish('step_limit', ANSWERS.stepLimit);
    const budget = policy.beforeModelCall({ step, modelCalls, usage });
    if (budget) return finish('stopped_by_policy', budget.answer, budget.rule);

    const res = await provider.complete(
      {
        system,
        // A copy: later pushes must not change what this request (and its trace event) contains.
        messages: [...messages],
        tools,
        maxTokens: AGENT_MAX_TOKENS,
        context: { scenario, step, promptVersion: PROMPT_VERSION },
      },
      signal,
    );
    modelCalls += 1;
    usage.inputTokens += res.usage.inputTokens;
    usage.outputTokens += res.usage.outputTokens;

    if (res.stopReason === 'refusal') {
      return finish(
        'model_refusal',
        res.content ? policy.finalizeAnswer(res.content, step) : ANSWERS.modelRefusal,
      );
    }
    if (res.stopReason === 'max_tokens' && res.toolCalls.length === 0) {
      return finish(
        'max_tokens',
        res.content ? policy.finalizeAnswer(res.content, step) : ANSWERS.maxTokens,
      );
    }
    if (res.toolCalls.length === 0) {
      return finish('completed', policy.finalizeAnswer(res.content, step));
    }

    messages.push({
      role: 'assistant',
      content: res.content,
      toolCalls: res.toolCalls,
      ...(res.providerState !== undefined && { providerState: res.providerState }),
    });

    let stop: { rule: RuleId; answer: string } | null = null;
    for (const call of res.toolCalls) {
      // Every call gets a result (the API expects one per tool_use), even after a stop decision.
      if (stop) {
        messages.push({ role: 'tool', toolCallId: call.id, content: stop.answer, isError: true });
        continue;
      }
      const gate = await policy.beforeTool(call, step, options.approve);
      if (gate.action === 'deny') {
        messages.push({ role: 'tool', toolCallId: call.id, content: gate.message, isError: true });
        if (gate.stopRun) stop = { rule: 'loop-detection', answer: ANSWERS.loopStopped };
        continue;
      }
      const result = toolbox.execute(call.name, policy.revealArgs(gate.args));
      if (result.ok && result.draft) drafts.push(result.draft);
      const after = policy.afterTool(call, result, step);
      log.emit({
        type: 'tool_call',
        name: call.name,
        scenario,
        step,
        input: call.arguments,
        output: { ok: result.ok, content: after.content },
      });
      messages.push({
        role: 'tool',
        toolCallId: call.id,
        content: after.content,
        ...(!result.ok && { isError: true }),
      });
      if (after.stop) stop = after.stop;
    }
    if (stop) return finish('stopped_by_policy', stop.answer, stop.rule);
  }
}
