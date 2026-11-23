import type { Recording, TraceEventInput } from '@trusted-ai-lab/llm-core';

/**
 * HAND-WRITTEN FIXTURE for the TracePanel preview — NOT model output (CLAUDE.md rule 6).
 * `kind: 'fixture'` and `model: 'fixture'` make that explicit in data; the UI labels it too.
 * Real recorded traces arrive in phase 3 via `pnpm record:agent`.
 */
export const PREVIEW_SCENARIO = 'trace-panel-preview';

export const previewRecording: Recording = {
  schemaVersion: 1,
  kind: 'fixture',
  scenario: PREVIEW_SCENARIO,
  model: 'fixture',
  recordedAt: '2026-11-23T00:00:00.000Z',
  promptVersion: 'preview-v0',
  note: 'Ručně psaná data pro náhled komponenty TracePanel.',
  steps: [
    {
      step: 0,
      response: {
        content: '',
        toolCalls: [
          {
            id: 'call-1',
            name: 'search_funds',
            arguments: { query: 'akciové fondy', filters: { category: 'akciový' } },
          },
        ],
        stopReason: 'tool_use',
        usage: { inputTokens: 400, outputTokens: 40 },
        latencyMs: 800,
      },
    },
    {
      step: 1,
      response: {
        content: '',
        toolCalls: [
          {
            id: 'call-2',
            name: 'draft_email',
            arguments: { toRole: 'klient', subject: 'Shrnutí fondů', body: '…' },
          },
        ],
        stopReason: 'tool_use',
        usage: { inputTokens: 600, outputTokens: 60 },
        latencyMs: 900,
      },
    },
    {
      step: 2,
      response: {
        content:
          'Odpovídá jeden fond: Fond Alfa (fiktivní). Koncept e-mailu připravit nemohu, tuto akci smí provést jen poradce.',
        toolCalls: [],
        stopReason: 'stop',
        usage: { inputTokens: 700, outputTokens: 50 },
        latencyMs: 700,
      },
    },
  ],
};

/** Order of the preview run: LLM steps are replayed, the other events stand in for the future agent runtime. */
export type PreviewItem = { kind: 'llm'; step: number } | { kind: 'event'; event: TraceEventInput };

export const previewScript: readonly PreviewItem[] = [
  { kind: 'llm', step: 0 },
  {
    kind: 'event',
    event: {
      type: 'policy_decision',
      name: 'tool-allowlist',
      scenario: PREVIEW_SCENARIO,
      step: 0,
      input: { persona: 'klient', tool: 'search_funds' },
      policy: {
        decision: 'allow',
        rule: 'tool-allowlist',
        reason: 'Persona „klient" smí používat nástroj search_funds.',
      },
    },
  },
  {
    kind: 'event',
    event: {
      type: 'tool_call',
      name: 'search_funds',
      scenario: PREVIEW_SCENARIO,
      step: 0,
      input: { query: 'akciové fondy', filters: { category: 'akciový' } },
      output: { results: [{ id: 'fond-alfa', name: 'Fond Alfa (fiktivní)' }] },
    },
  },
  { kind: 'llm', step: 1 },
  {
    kind: 'event',
    event: {
      type: 'policy_decision',
      name: 'tool-allowlist',
      scenario: PREVIEW_SCENARIO,
      step: 1,
      input: { persona: 'klient', tool: 'draft_email' },
      policy: {
        decision: 'deny',
        rule: 'tool-allowlist',
        reason:
          'Persona „klient" nesmí používat nástroj draft_email. Akce s dopadem je povolená jen poradci.',
      },
    },
  },
  { kind: 'llm', step: 2 },
];
