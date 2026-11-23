import { PII_TYPES, type PiiType, type PseudonymEntry } from '@trusted-ai-lab/pii-cz';
import { cs } from '../../i18n/cs.ts';

/**
 * Stand-in for a model answer: a fixed template that uses whatever placeholders were issued.
 * Labelled in the UI as simulated — it is not model output (CLAUDE.md rule 6 / 8).
 */
export function simulatedReply(entries: readonly PseudonymEntry[]): string {
  const r = cs.pii.reversible.reply;
  const firstOf = (type: PiiType) => entries.find((e) => e.type === type)?.placeholder;
  const persons = entries.filter((e) => e.type === 'PERSON');
  const sentences: string[] = [];
  if (persons[1]) sentences.push(r.sentences.PERSON(persons[1].placeholder));
  for (const type of PII_TYPES) {
    if (type === 'PERSON') continue;
    const placeholder = firstOf(type);
    if (placeholder) sentences.push(r.sentences[type](placeholder));
  }
  return [`${r.greeting(persons[0]?.placeholder)}\n${r.thanks}`, sentences.join(' '), r.closing]
    .filter(Boolean)
    .join('\n\n');
}
