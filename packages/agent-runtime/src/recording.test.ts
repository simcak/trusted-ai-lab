import { ReplayDriftError, ReplayMissError, createTraceLog } from '@trusted-ai-lab/llm-core';
import { describe, expect, it, vi } from 'vitest';
import { AGENT_EFFORT, AGENT_MODEL, DEFAULT_POLICY } from './config.ts';
import { runAgent } from './loop.ts';
import {
  AgentRecordingSchema,
  ReplayIncompleteError,
  createRecorder,
  recordingFileName,
  replayRecording,
  runKey,
  type AgentRecording,
  type RecordedApproval,
} from './recording.ts';
import { SCENARIOS, type ScenarioId } from './scenarios.ts';
import { FUNDS, call, scriptedProvider, type ScriptStep } from './testing.ts';

const recordedAt = '2026-11-24T12:00:00.000Z';

/** Records a scripted run exactly like scripts/record-agent.ts does with the real model. */
async function recordWithTrace(id: ScenarioId, guardrails: boolean, script: ScriptStep[]) {
  const s = SCENARIOS[id];
  const recorder = createRecorder(scriptedProvider(script));
  const approvals: RecordedApproval[] = [];
  const log = createTraceLog();
  await runAgent({
    provider: recorder.provider,
    log,
    funds: FUNDS,
    persona: s.persona,
    guardrails,
    userMessage: s.userMessage,
    ...(s.faults && { faults: s.faults }),
    scenario: runKey(id, guardrails),
    today: new Date(recordedAt),
    approve: (request) => {
      approvals.push({ toolName: request.toolName, decision: 'approved', decidedBy: 'author' });
      return Promise.resolve({ decision: 'approved', decidedBy: 'author' });
    },
  });
  const recording = AgentRecordingSchema.parse({
    schemaVersion: 2,
    kind: 'fixture',
    scenario: runKey(id, guardrails),
    model: AGENT_MODEL,
    recordedAt,
    promptVersion: 'agent-v1',
    steps: recorder.steps,
    run: {
      scenarioId: id,
      guardrails,
      persona: s.persona,
      provider: 'byok-anthropic',
      effort: AGENT_EFFORT,
      ...(guardrails && { policy: DEFAULT_POLICY }),
    },
    approvals,
  });
  return { recording, log };
}

const record = async (id: ScenarioId, guardrails: boolean, script: ScriptStep[]) =>
  (await recordWithTrace(id, guardrails, script)).recording;

const s2Script: ScriptStep[] = [
  { toolCalls: [call('a', 'search_funds', { query: '', filters: { category: 'akciový' } })] },
  {
    toolCalls: [
      call('b', 'draft_email', {
        toRole: 'klient',
        subject: 'Poplatky',
        body: 'Dobrý den, <OSOBA_1>.',
      }),
    ],
  },
  { content: 'Koncept je připravený ke kontrole.' },
];

describe('recording and replay', () => {
  it('names runs and files consistently', () => {
    expect(runKey('s4-rodne-cislo', true)).toBe('s4-rodne-cislo/on');
    expect(recordingFileName('s4-rodne-cislo', false)).toBe('s4-rodne-cislo.off.json');
  });

  it('stores request hashes and the serving model, but no provider state', async () => {
    const recording = await record('s2-injekce', true, s2Script);
    expect(recording.steps).toHaveLength(3);
    expect(recording.steps[0]).toMatchObject({
      step: 0,
      requestHash: expect.stringMatching(/^[0-9a-f]{64}$/) as unknown,
      response: { model: 'scripted', requestId: 'req_0' },
    });
    expect(JSON.stringify(recording)).not.toContain('sig-');
    expect(recording.approvals).toEqual([
      { toolName: 'draft_email', decision: 'approved', decidedBy: 'author' },
    ]);
  });

  it('replays to the same result and the same trace as the recorded run, with request verification', async () => {
    const { recording, log: recordedLog } = await recordWithTrace('s2-injekce', true, s2Script);
    const replayed = createTraceLog();
    const onApproval = vi.fn(() => Promise.resolve());
    const result = await replayRecording(recording, {
      funds: FUNDS,
      log: replayed,
      verifyRequest: true,
      onApproval,
    });
    expect(result).toMatchObject({ status: 'completed', modelCalls: 3 });
    expect(result.drafts[0]?.body).toBe('Dobrý den, Petru Malou.');
    expect(onApproval).toHaveBeenCalledWith(expect.objectContaining({ toolName: 'draft_email' }), {
      decision: 'approved',
      decidedBy: 'author',
    });
    // Identical except the clock and which provider answered (the real one vs. replay).
    const comparable = (log: typeof replayed) =>
      log
        .getSnapshot()
        .map(({ timestamp: _t, provider: _p, ...e }) =>
          e.type === 'llm_call' ? { ...e, name: 'model' } : e,
        );
    expect(comparable(replayed)).toEqual(comparable(recordedLog));
  });

  it('replays a run in which the policy answered without the model', async () => {
    const recording = await record('s6-doporuceni', true, []);
    expect(recording.steps).toEqual([]);
    await expect(
      replayRecording(recording, { funds: FUNDS, log: createTraceLog(), verifyRequest: true }),
    ).resolves.toMatchObject({ status: 'refused_by_policy', modelCalls: 0 });
  });

  it('fails with ReplayDriftError when the code would send something else', async () => {
    const recording = await record('s1-bezny-dotaz', true, [{ content: 'Hotovo.' }]);
    const tampered = {
      ...recording,
      steps: recording.steps.map((s) => ({ ...s, requestHash: 'f'.repeat(64) })),
    };
    await expect(
      replayRecording(tampered, { funds: FUNDS, log: createTraceLog(), verifyRequest: true }),
    ).rejects.toBeInstanceOf(ReplayDriftError);
  });

  it('fails when the code needs more model calls than were recorded', async () => {
    const recording = await record('s2-injekce', true, s2Script);
    const truncated = { ...recording, steps: recording.steps.slice(0, 1) };
    await expect(
      replayRecording(truncated, { funds: FUNDS, log: createTraceLog() }),
    ).rejects.toBeInstanceOf(ReplayMissError);
  });

  it('fails when recorded steps or approvals are left unused', async () => {
    const recording = await record('s1-bezny-dotaz', true, [{ content: 'Hotovo.' }]);
    const extra = {
      ...recording,
      steps: [...recording.steps, { ...recording.steps[0]!, step: 1 }],
    };
    await expect(
      replayRecording(extra, { funds: FUNDS, log: createTraceLog() }),
    ).rejects.toBeInstanceOf(ReplayIncompleteError);
    const extraApproval: AgentRecording = {
      ...recording,
      approvals: [{ toolName: 'draft_email', decision: 'rejected', decidedBy: 'flag' }],
    };
    await expect(
      replayRecording(extraApproval, { funds: FUNDS, log: createTraceLog() }),
    ).rejects.toBeInstanceOf(ReplayIncompleteError);
  });

  it('keeps the duplicate-step check of the base schema', async () => {
    const recording = await record('s1-bezny-dotaz', true, [{ content: 'Hotovo.' }]);
    const duplicate = { ...recording, steps: [recording.steps[0], recording.steps[0]] };
    expect(AgentRecordingSchema.safeParse(duplicate).success).toBe(false);
  });
});
