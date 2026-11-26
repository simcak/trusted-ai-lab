import { createTraceLog, type TraceEvent } from '@trusted-ai-lab/llm-core';
import {
  createPseudonymizer,
  type Finding,
  type PiiType,
  type PseudonymEntry,
  type Replacement,
} from '@trusted-ai-lab/pii-cz';
import { cs } from '../../i18n/cs.ts';
import { simulatedReply } from './simulated-reply.ts';

const SCENARIO = 'pii-reversible';

const countByType = (items: readonly { type: PiiType }[]) => {
  const counts: Partial<Record<PiiType, number>> = {};
  for (const item of items) counts[item.type] = (counts[item.type] ?? 0) + 1;
  return counts;
};

export interface Flow {
  masked: string;
  replacements: readonly Replacement[];
  reply: string;
  restored: string;
  unknown: string[];
  entries: readonly PseudonymEntry[];
  events: readonly TraceEvent[];
}

/**
 * The reversible round trip, all in memory: pseudonymise, a simulated reply (labelled as such
 * in the UI), re-identify. Trace events carry counts and placeholders, never values.
 */
export function runFlow(text: string, findings: readonly Finding[]): Flow {
  const session = createPseudonymizer();
  const log = createTraceLog();

  const { text: masked, replacements } = session.pseudonymize(text, findings);
  const entries = session.entries();
  log.emit({
    type: 'pii',
    name: 'pseudonymize',
    scenario: SCENARIO,
    step: 1,
    input: { characters: text.length, findings: findings.length },
    output: {
      replaced: replacements.length,
      byType: countByType(replacements),
      placeholders: entries.map((e) => e.placeholder),
    },
  });

  const reply = simulatedReply(entries);
  log.emit({
    type: 'info',
    name: 'simulated_model_reply',
    scenario: SCENARIO,
    step: 2,
    input: { characters: masked.length },
    output: { note: cs.pii.reversible.simulatedBadge, characters: reply.length },
  });

  const restored = session.reidentify(reply);
  log.emit({
    type: 'pii',
    name: 'reidentify',
    scenario: SCENARIO,
    step: 3,
    output: { restored: restored.restored, unknown: restored.unknown },
  });

  return {
    masked,
    replacements,
    reply,
    restored: restored.text,
    unknown: restored.unknown,
    entries,
    events: log.getSnapshot(),
  };
}
