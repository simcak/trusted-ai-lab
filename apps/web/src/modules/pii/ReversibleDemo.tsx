import { createTraceLog, type TraceEvent } from '@trusted-ai-lab/llm-core';
import {
  createPseudonymizer,
  type Finding,
  type PiiType,
  type PseudonymEntry,
} from '@trusted-ai-lab/pii-cz';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { TracePanel } from '../../components/TracePanel/TracePanel.tsx';
import { cs } from '../../i18n/cs.ts';
import styles from './pii.module.css';
import { simulatedReply } from './simulated-reply.ts';

const SCENARIO = 'pii-reversible';

const countByType = (items: readonly { type: PiiType }[]) => {
  const counts: Partial<Record<PiiType, number>> = {};
  for (const item of items) counts[item.type] = (counts[item.type] ?? 0) + 1;
  return counts;
};

interface Flow {
  masked: string;
  reply: string;
  restored: string;
  unknown: string[];
  entries: readonly PseudonymEntry[];
  events: readonly TraceEvent[];
}

/** Runs the whole round trip in memory. Trace events carry counts and placeholders, never values. */
function runFlow(text: string, findings: readonly Finding[]): Flow {
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
    reply,
    restored: restored.text,
    unknown: restored.unknown,
    entries,
    events: log.getSnapshot(),
  };
}

export function ReversibleDemo({ text, findings }: { text: string; findings: readonly Finding[] }) {
  const t = cs.pii.reversible;
  const flow = useMemo(() => runFlow(text, findings), [text, findings]);

  return (
    <section className={styles.section} aria-labelledby="reversible-heading">
      <h2 id="reversible-heading">{t.heading}</h2>
      <p>{t.intro}</p>

      {findings.length === 0 ? (
        <p className={styles.muted}>{t.empty}</p>
      ) : (
        <>
          <ol className={styles.flow} data-testid="pii-flow">
            <li>
              <h3>{t.steps.original}</h3>
              <pre className={styles.textBox}>{text}</pre>
            </li>
            <li>
              <h3>{t.steps.masked}</h3>
              <pre className={styles.textBox} data-testid="pii-flow-masked">
                {flow.masked}
              </pre>
            </li>
            <li>
              <h3>{t.steps.reply}</h3>
              <p className={styles.badge} data-testid="simulated-badge">
                {t.simulatedBadge}
              </p>
              <pre className={styles.textBox} data-testid="pii-flow-reply">
                {flow.reply}
              </pre>
            </li>
            <li>
              <h3>{t.steps.restored}</h3>
              <pre className={styles.textBox} data-testid="pii-flow-restored">
                {flow.restored}
              </pre>
              {flow.unknown.length > 0 && <p role="alert">{t.unknown(flow.unknown.join(', '))}</p>}
            </li>
          </ol>
          <p className={styles.small}>
            {t.simulatedNote}{' '}
            <Link to={{ pathname: '/agent', search: '?scenario=s4-rodne-cislo' }}>
              {t.simulatedNoteLink}
            </Link>
            .
          </p>
          <p className={styles.small}>{t.limitation}</p>

          <h3>{t.mapHeading}</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{t.mapColumns.placeholder}</th>
                  <th scope="col">{t.mapColumns.type}</th>
                  <th scope="col">{t.mapColumns.original}</th>
                </tr>
              </thead>
              <tbody>
                {flow.entries.map((e) => (
                  <tr key={e.placeholder}>
                    <td>
                      <code>{e.placeholder}</code>
                    </td>
                    <td>{cs.pii.types[e.type]}</td>
                    <td>
                      <code>{e.original}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.small}>{t.mapNote}</p>

          <TracePanel events={flow.events} title={t.traceTitle} headingLevel={3} />
        </>
      )}
    </section>
  );
}
