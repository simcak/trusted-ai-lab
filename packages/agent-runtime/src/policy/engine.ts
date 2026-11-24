import {
  canonicalJson,
  type LlmUsage,
  type PolicyDecision,
  type ToolCall,
  type ToolDefinition,
  type TraceLog,
} from '@trusted-ai-lab/llm-core';
import type { Replacement } from '@trusted-ai-lab/pii-cz';
import { z } from 'zod';
import {
  APPROVAL_REQUIRED,
  PERSONA_TOOLS,
  type Persona,
  type PolicyConfig,
  type RuleId,
} from '../config.ts';
import { ANSWERS, QUARANTINED, REASONS } from '../messages.ts';
import { TOOL_INPUTS, isToolName, type DraftEmailInput, type ToolName } from '../tools/schemas.ts';
import type { ToolResult } from '../tools/index.ts';
import { isAdviceAnswer, isAdviceRequest } from './advice.ts';
import { detectInjection } from './injection.ts';
import { countByType, createPiiGuard } from './pii.ts';

export type ApprovalDecision = 'approved' | 'rejected';
/** `author` = asked interactively while recording, `flag` = preset by a script flag, `user` = BYOK. */
export type DecidedBy = 'author' | 'flag' | 'user';

export interface ApprovalRequest {
  toolCallId: string;
  toolName: ToolName;
  step: number;
  /** Re-identified locally: the human sees the real content, the model and the trace do not. */
  draft: DraftEmailInput;
}
export interface ApprovalOutcome {
  decision: ApprovalDecision;
  decidedBy: DecidedBy;
}
export type Approver = (request: ApprovalRequest) => Promise<ApprovalOutcome>;

export type GateDecision =
  { action: 'run'; args: unknown } | { action: 'deny'; message: string; stopRun: boolean };

export type Stop = { rule: RuleId; answer: string };

/**
 * The policy layer. The loop calls these hooks at fixed points; the hooks decide and record every
 * decision as a `policy_decision` trace event with a rule id and a reason. Nothing here is text in
 * the prompt: the rules hold whatever the model does.
 */
export interface Policy {
  readonly enabled: boolean;
  /** Before the model is involved at all. A refusal answers without any model call. */
  checkInput(text: string): Stop | null;
  /** The user's message as the model will see it. */
  protectInbound(text: string): string;
  /** Computed once per run: tools must not change between calls (preserved thinking). */
  selectTools(all: readonly ToolDefinition[]): ToolDefinition[];
  beforeModelCall(state: { step: number; modelCalls: number; usage: LlmUsage }): Stop | null;
  beforeTool(call: ToolCall, step: number, approve: Approver): Promise<GateDecision>;
  /** Arguments for local execution (placeholders restored); never mutates `args`. */
  revealArgs(args: unknown): unknown;
  /** What the model gets back from a tool, and whether the run must stop after it. */
  afterTool(
    call: ToolCall,
    result: ToolResult,
    step: number,
  ): { content: string; stop: Stop | null };
  /** The final answer as the user sees it. */
  finalizeAnswer(text: string, step: number): string;
}

export interface PolicyContext {
  log: TraceLog;
  scenario: string;
  persona: Persona;
  config: PolicyConfig;
  today: Date;
}

const DECIDED_BY: Record<DecidedBy, string> = {
  author: 'autor při nahrávání',
  flag: 'předvolba nahrávacího skriptu',
  user: 'uživatel',
};

const resultForModel = (result: ToolResult): unknown =>
  result.ok ? result.forModel : { error: result.error };

/** Guardrails off: the prompt alone. The tools still validate their own input. */
export function createPassthroughPolicy(): Policy {
  return {
    enabled: false,
    checkInput: () => null,
    protectInbound: (text) => text,
    selectTools: (all) => [...all],
    beforeModelCall: () => null,
    beforeTool: (call) => Promise.resolve({ action: 'run', args: call.arguments }),
    revealArgs: (args) => structuredClone(args),
    afterTool: (_call, result) => ({ content: JSON.stringify(resultForModel(result)), stop: null }),
    finalizeAnswer: (text) => text,
  };
}

export function createGuardrails(ctx: PolicyContext): Policy {
  const { log, scenario, persona, config } = ctx;
  const pii = createPiiGuard({ today: ctx.today });
  const allowed = new Set<string>(PERSONA_TOOLS[persona]);
  const callCounts = new Map<string, number>();
  const consecutiveErrors = new Map<string, number>();

  const decide = (
    rule: RuleId,
    decision: PolicyDecision['decision'],
    reason: string,
    step?: number,
    name?: string,
  ) =>
    log.emit({
      type: 'policy_decision',
      name: name ?? rule,
      scenario,
      ...(step !== undefined && { step }),
      policy: { decision, rule, reason },
    });

  const piiEvent = (target: string, replacements: readonly Replacement[], step?: number) => {
    if (replacements.length === 0) return;
    log.emit({
      type: 'pii',
      name: 'pseudonymize',
      scenario,
      ...(step !== undefined && { step }),
      input: { target },
      output: {
        replaced: replacements.length,
        byType: countByType(replacements),
        placeholders: [...new Set(replacements.map((r) => r.replacement))],
      },
    });
  };

  return {
    enabled: true,

    checkInput(text) {
      if (!isAdviceRequest(text)) return null;
      decide('content-advice', 'deny', REASONS.adviceRequest);
      return { rule: 'content-advice', answer: ANSWERS.adviceRefused };
    },

    protectInbound(text) {
      const { value, replacements } = pii.protectText(text);
      piiEvent('user_message', replacements);
      return value;
    },

    selectTools(all) {
      const offered = all.filter((t) => allowed.has(t.name));
      const hidden = all.filter((t) => !allowed.has(t.name)).map((t) => t.name);
      const names = offered.map((t) => t.name);
      if (hidden.length > 0) {
        decide('tool-allowlist', 'modify', REASONS.toolsHidden(persona, names, hidden));
      } else {
        decide('tool-allowlist', 'allow', REASONS.toolsOffered(persona, names));
      }
      return offered;
    },

    beforeModelCall({ step, modelCalls, usage }) {
      if (modelCalls >= config.maxModelCalls) {
        decide('step-budget', 'deny', REASONS.stepBudget(config.maxModelCalls), step);
        return { rule: 'step-budget', answer: ANSWERS.budgetStopped };
      }
      const used = usage.inputTokens + usage.outputTokens;
      if (used >= config.maxTotalTokens) {
        decide('token-budget', 'deny', REASONS.tokenBudget(used, config.maxTotalTokens), step);
        return { rule: 'token-budget', answer: ANSWERS.budgetStopped };
      }
      return null;
    },

    async beforeTool(call, step, approve) {
      // 1. Allowlist: also blocks tools the model was never offered (hallucinated or injected names).
      if (!isToolName(call.name) || !allowed.has(call.name)) {
        const reason = REASONS.toolNotAllowed(persona, call.name);
        decide('tool-allowlist', 'deny', reason, step, call.name);
        return { action: 'deny', message: REASONS.deniedForModel(reason), stopRun: false };
      }
      // 2. Arguments: model output is untrusted.
      const parsed = TOOL_INPUTS[call.name].safeParse(call.arguments);
      if (!parsed.success) {
        const reason = REASONS.invalidArgs(call.name, z.prettifyError(parsed.error));
        decide('tool-args', 'deny', reason, step, call.name);
        return { action: 'deny', message: REASONS.deniedForModel(reason), stopRun: false };
      }
      // 3. Loops: the same call again and again.
      const key = `${call.name}:${canonicalJson(parsed.data)}`;
      const seen = callCounts.get(key) ?? 0;
      if (seen >= config.maxIdenticalCalls) {
        const reason = REASONS.repeatedCall(call.name, seen);
        decide('loop-detection', 'deny', reason, step, call.name);
        return { action: 'deny', message: REASONS.deniedForModel(reason), stopRun: true };
      }
      callCounts.set(key, seen + 1);
      // 4. Human approval for actions with an impact.
      if (APPROVAL_REQUIRED.includes(call.name)) {
        decide(
          'human-approval',
          'require_approval',
          REASONS.approvalRequired(call.name),
          step,
          call.name,
        );
        const draft = pii.revealValue(parsed.data as DraftEmailInput).value;
        const outcome = await approve({ toolCallId: call.id, toolName: call.name, step, draft });
        const by = DECIDED_BY[outcome.decidedBy];
        if (outcome.decision === 'rejected') {
          decide('human-approval', 'deny', REASONS.rejected(by), step, call.name);
          return { action: 'deny', message: REASONS.rejectedForModel, stopRun: false };
        }
        decide('human-approval', 'allow', REASONS.approved(by), step, call.name);
        return { action: 'run', args: parsed.data };
      }
      decide('tool-allowlist', 'allow', REASONS.toolAllowed(call.name), step, call.name);
      return { action: 'run', args: parsed.data };
    },

    revealArgs: (args) => pii.revealValue(args).value,

    afterTool(call, result, step) {
      // Quarantine suspicious fields before anything else sees them.
      const quarantined = mapWithPath(resultForModel(result), (s, path) => {
        const patterns = detectInjection(s);
        if (patterns.length === 0) return s;
        decide(
          'prompt-injection',
          'modify',
          REASONS.injection(call.name, path, patterns),
          step,
          call.name,
        );
        return QUARANTINED;
      });
      const { value, replacements } = pii.protectValue(quarantined);
      piiEvent(`tool_output:${call.name}`, replacements, step);

      let stop: Stop | null = null;
      if (result.ok) {
        consecutiveErrors.set(call.name, 0);
      } else {
        const errors = (consecutiveErrors.get(call.name) ?? 0) + 1;
        consecutiveErrors.set(call.name, errors);
        if (errors >= config.maxConsecutiveToolErrors) {
          decide(
            'loop-detection',
            'deny',
            REASONS.repeatedErrors(call.name, errors),
            step,
            call.name,
          );
          stop = { rule: 'loop-detection', answer: ANSWERS.loopStopped };
        }
      }
      return { content: wrapUntrusted(call.name, value), stop };
    },

    finalizeAnswer(text, step) {
      if (isAdviceAnswer(text)) {
        decide('content-advice', 'modify', REASONS.adviceAnswer, step);
        return ANSWERS.adviceRemoved;
      }
      const revealed = pii.revealText(text);
      if (revealed.restored > 0 || revealed.unknown.length > 0) {
        log.emit({
          type: 'pii',
          name: 'reidentify',
          scenario,
          step,
          output: { restored: revealed.restored, unknown: revealed.unknown },
        });
      }
      return revealed.text;
    },
  };
}

/**
 * Tool output is data from outside: delimited and labelled so the model can tell it apart from
 * instructions. A closing tag inside the data cannot end the block early.
 */
export function wrapUntrusted(tool: string, value: unknown): string {
  const json = JSON.stringify(value).replaceAll('</tool_output', '<\\/tool_output');
  return `<tool_output tool="${tool}" trust="untrusted">\n${json}\n</tool_output>`;
}

function mapWithPath(value: unknown, fn: (s: string, path: string) => string, path = '$'): unknown {
  if (typeof value === 'string') return fn(value, path);
  if (Array.isArray(value)) return value.map((v, i) => mapWithPath(v, fn, `${path}[${i}]`));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, mapWithPath(v, fn, `${path}.${k}`)]),
    );
  }
  return value;
}
