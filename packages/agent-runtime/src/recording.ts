import {
  ProviderIdSchema,
  RecordingSchema,
  ReplayProvider,
  hashRequest,
  type LlmProvider,
  type RecordedStep,
  type TraceLog,
} from '@trusted-ai-lab/llm-core';
import { z } from 'zod';
import { PERSONAS, PolicyConfigSchema } from './config.ts';
import type { Fund } from './funds.ts';
import { runAgent, type AgentRunResult } from './loop.ts';
import type { ApprovalOutcome, ApprovalRequest } from './policy/engine.ts';
import { SCENARIOS, SCENARIO_IDS, type ScenarioId } from './scenarios.ts';
import { TOOL_NAMES } from './tools/schemas.ts';

export const RecordedApprovalSchema = z.strictObject({
  toolName: z.enum(TOOL_NAMES),
  decision: z.enum(['approved', 'rejected']),
  decidedBy: z.enum(['author', 'flag']),
});
export type RecordedApproval = z.infer<typeof RecordedApprovalSchema>;

/** A recorded agent run: llm-core recording + how the run was configured + human decisions. */
export const AgentRecordingSchema = RecordingSchema.extend({
  run: z.strictObject({
    scenarioId: z.enum(SCENARIO_IDS),
    guardrails: z.boolean(),
    persona: z.enum(PERSONAS),
    provider: ProviderIdSchema,
    effort: z.string().min(1),
    /** Policy limits the run used (guardrails on only). Replays use these values. */
    policy: PolicyConfigSchema.optional(),
  }),
  /** Human decisions in the order they were asked for. */
  approvals: z.array(RecordedApprovalSchema),
});
export type AgentRecording = z.infer<typeof AgentRecordingSchema>;

export const runKey = (id: ScenarioId, guardrails: boolean) => `${id}/${guardrails ? 'on' : 'off'}`;

export const recordingFileName = (id: ScenarioId, guardrails: boolean) =>
  `${id}.${guardrails ? 'on' : 'off'}.json`;

/**
 * Wraps the real provider while recording: stores the request hash and the response fields that
 * replay needs — not the opaque provider state (thinking signatures).
 */
export function createRecorder(inner: LlmProvider): {
  provider: LlmProvider;
  steps: RecordedStep[];
} {
  const steps: RecordedStep[] = [];
  return {
    steps,
    provider: {
      id: inner.id,
      async complete(req, signal) {
        const requestHash = await hashRequest(req);
        const res = await inner.complete(req, signal);
        steps.push({
          step: req.context?.step ?? steps.length,
          requestHash,
          response: {
            content: res.content,
            toolCalls: res.toolCalls,
            stopReason: res.stopReason,
            usage: res.usage,
            latencyMs: res.latencyMs,
            model: res.model,
            ...(res.requestId && { requestId: res.requestId }),
          },
        });
        return res;
      },
    },
  };
}

/** The recording no longer matches what the code does (fewer calls or approvals were used). */
export class ReplayIncompleteError extends Error {
  override readonly name = 'ReplayIncompleteError';
}

export interface ReplayOptions {
  funds: readonly Fund[];
  log: TraceLog;
  /** Compare request hashes (needs `crypto.subtle`: Node, tests, secure browser contexts). */
  verifyRequest?: boolean;
  delayMs?: number;
  /** Lets the UI show the recorded decision before the run continues. */
  onApproval?: (request: ApprovalRequest, recorded: ApprovalOutcome) => Promise<void>;
  signal?: AbortSignal;
}

/**
 * Re-runs a recorded scenario: loop, policy, tools and pii-cz run live; only the model's answers
 * and the human decisions come from the recording. Shared by the web page and `record-agent --check`.
 */
export async function replayRecording(
  recording: AgentRecording,
  options: ReplayOptions,
): Promise<AgentRunResult> {
  const scenario = SCENARIOS[recording.run.scenarioId];
  const provider = new ReplayProvider([recording], {
    verifyRequest: options.verifyRequest ?? false,
    delayMs: options.delayMs ?? 0,
  });
  let approvalIndex = 0;
  const result = await runAgent({
    provider,
    log: options.log,
    funds: options.funds,
    persona: recording.run.persona,
    guardrails: recording.run.guardrails,
    userMessage: scenario.userMessage,
    ...(scenario.faults && { faults: scenario.faults }),
    ...(recording.run.policy && { policy: recording.run.policy }),
    scenario: recording.scenario,
    today: new Date(recording.recordedAt),
    signal: options.signal,
    approve: async (request) => {
      const recorded = recording.approvals[approvalIndex];
      approvalIndex += 1;
      if (!recorded || recorded.toolName !== request.toolName) {
        throw new ReplayIncompleteError(
          `Recording ${recording.scenario} has no approval #${approvalIndex} for ${request.toolName}`,
        );
      }
      const outcome: ApprovalOutcome = {
        decision: recorded.decision,
        decidedBy: recorded.decidedBy,
      };
      await options.onApproval?.(request, outcome);
      return outcome;
    },
  });
  if (
    result.modelCalls !== recording.steps.length ||
    approvalIndex !== recording.approvals.length
  ) {
    throw new ReplayIncompleteError(
      `Recording ${recording.scenario}: used ${result.modelCalls}/${recording.steps.length} steps and ${approvalIndex}/${recording.approvals.length} approvals`,
    );
  }
  return result;
}
