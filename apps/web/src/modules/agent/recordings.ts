import {
  AgentRecordingSchema,
  runKey,
  type AgentRecording,
  type ScenarioId,
} from '@trusted-ai-lab/agent-runtime';

// Written by `pnpm record:agent`; checked against the code by `pnpm evals:check` in CI. Until the
// author records them the folder is empty and every scenario shows „not recorded yet“.
const files = import.meta.glob('../../../../../evals/agent/recordings/*.json', {
  eager: true,
  import: 'default',
});

const recordings = new Map<string, AgentRecording>(
  Object.values(files).map((raw) => {
    const recording = AgentRecordingSchema.parse(raw);
    return [recording.scenario, recording];
  }),
);

export function getRecording(id: ScenarioId, guardrails: boolean): AgentRecording | undefined {
  return recordings.get(runKey(id, guardrails));
}
