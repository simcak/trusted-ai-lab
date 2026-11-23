import { describe, expect, it } from 'vitest';
import { RecordingSchema, parseRecordings } from './recording.ts';
import { fixtureRecording } from './test-fixtures.ts';

describe('RecordingSchema', () => {
  it('accepts a valid recording', () => {
    expect(RecordingSchema.parse(fixtureRecording)).toEqual(fixtureRecording);
  });

  it.each(['model', 'recordedAt', 'promptVersion'] as const)(
    'requires provenance field %s (rule 6: every trace names model, date and prompt version)',
    (field) => {
      const { [field]: _omitted, ...rest } = fixtureRecording;
      expect(RecordingSchema.safeParse(rest).success).toBe(false);
    },
  );

  it('rejects an unknown kind', () => {
    expect(RecordingSchema.safeParse({ ...fixtureRecording, kind: 'handmade' }).success).toBe(
      false,
    );
  });

  it('rejects duplicate step numbers', () => {
    const [first] = fixtureRecording.steps;
    const result = RecordingSchema.safeParse({ ...fixtureRecording, steps: [first, first] });
    expect(result.success).toBe(false);
  });

  it('rejects negative token counts', () => {
    const [first] = fixtureRecording.steps;
    const broken = {
      ...fixtureRecording,
      steps: [
        { ...first, response: { ...first?.response, usage: { inputTokens: -1, outputTokens: 0 } } },
      ],
    };
    expect(RecordingSchema.safeParse(broken).success).toBe(false);
  });
});

describe('parseRecordings', () => {
  it('parses JSON data into recordings', () => {
    const json: unknown = JSON.parse(JSON.stringify([fixtureRecording]));
    expect(parseRecordings(json)).toEqual([fixtureRecording]);
  });

  it('throws on invalid JSON data', () => {
    expect(() => parseRecordings({ not: 'an array' })).toThrow();
  });
});
