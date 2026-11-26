import { createPseudonymizer, detect, pseudonymize, redact } from '@trusted-ai-lab/pii-cz';
import { describe, expect, it } from 'vitest';
import { SAMPLE_IDS, SAMPLES } from './samples.ts';
import {
  joinRestored,
  joinText,
  redactReplacements,
  replySegments,
  segmentsFromReplacements,
} from './segments.ts';
import { simulatedReply } from './simulated-reply.ts';

describe.each(SAMPLE_IDS)('segments for sample %s', (id) => {
  const text = SAMPLES[id];
  const findings = detect(text);

  it('redaction joins back to exactly what redact() returns', () => {
    const segments = segmentsFromReplacements(text, redactReplacements(findings));
    expect(joinText(segments)).toBe(redact(text, findings));
    expect(segments.filter((s) => s.kind === 'token')).toHaveLength(findings.length);
  });

  it('pseudonymisation joins back to exactly what pseudonymize() returns', () => {
    const { text: masked, replacements } = pseudonymize(text, findings);
    expect(joinText(segmentsFromReplacements(text, replacements))).toBe(masked);
  });

  it('a reply splits at the issued placeholders and restores like reidentify()', () => {
    const session = createPseudonymizer();
    session.pseudonymize(text, findings);
    const reply = simulatedReply(session.entries());
    const segments = replySegments(reply, session.entries());
    expect(joinText(segments)).toBe(reply);
    expect(joinRestored(segments)).toBe(session.reidentify(reply).text);
  });
});

describe('replySegments', () => {
  it('leaves placeholders the session did not issue as plain text', () => {
    const segments = replySegments('Pro <OSOBA_9> nic.', [
      { placeholder: '<OSOBA_1>', type: 'PERSON', original: 'Jan Novák' },
    ]);
    expect(segments).toEqual([{ kind: 'text', text: 'Pro <OSOBA_9> nic.' }]);
  });
});
