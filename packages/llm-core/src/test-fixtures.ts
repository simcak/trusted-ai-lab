import type { Recording } from './recording.ts';

/** Hand-written fixture for unit tests only — not model output. */
export const fixtureRecording: Recording = {
  schemaVersion: 1,
  kind: 'fixture',
  scenario: 'test-scenario',
  model: 'fixture',
  recordedAt: '2026-11-23T10:00:00.000Z',
  promptVersion: 'test-v1',
  steps: [
    {
      step: 0,
      response: {
        content: '',
        toolCalls: [{ id: 'call-1', name: 'search_funds', arguments: { query: 'akcie' } }],
        stopReason: 'tool_use',
        usage: { inputTokens: 120, outputTokens: 18 },
        latencyMs: 640,
      },
    },
    {
      step: 1,
      response: {
        content: 'Hotovo.',
        toolCalls: [],
        stopReason: 'stop',
        usage: { inputTokens: 210, outputTokens: 4 },
        latencyMs: 410,
      },
    },
  ],
};
