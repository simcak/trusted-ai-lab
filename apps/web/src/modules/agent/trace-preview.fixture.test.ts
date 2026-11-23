import { RecordingSchema, TraceEventSchema } from '@trusted-ai-lab/llm-core';
import { describe, expect, it } from 'vitest';
import { previewRecording, previewScript } from './trace-preview.fixture.ts';

describe('trace preview fixture', () => {
  it('is a valid recording explicitly marked as a fixture', () => {
    const parsed = RecordingSchema.parse(previewRecording);
    expect(parsed.kind).toBe('fixture');
    expect(parsed.model).toBe('fixture');
  });

  it('only replays steps that exist in the recording', () => {
    const recorded = new Set(previewRecording.steps.map((s) => s.step));
    for (const item of previewScript) {
      if (item.kind === 'llm') expect(recorded.has(item.step)).toBe(true);
    }
  });

  it('only contains schema-valid trace events', () => {
    for (const item of previewScript) {
      if (item.kind !== 'event') continue;
      const event = { ...item.event, id: 'evt-x', seq: 1, timestamp: '2026-11-23T00:00:00.000Z' };
      expect(TraceEventSchema.safeParse(event).success).toBe(true);
    }
  });
});
