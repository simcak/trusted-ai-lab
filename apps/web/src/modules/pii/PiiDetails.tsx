import { DEFAULT_MIN_SCORE, type Finding } from '@trusted-ai-lab/pii-cz';
import { DrawerSection } from '../../components/InfoDrawer/DrawerSection.tsx';
import { TracePanel } from '../../components/TracePanel/TracePanel.tsx';
import { cs } from '../../i18n/cs.ts';
import { EvalResults } from './EvalResults.tsx';
import { FindingsTable } from './FindingsTable.tsx';
import type { Flow } from './flow.ts';
import { formatScore } from './format.ts';
import { NerPanel, type NerState } from './NerPanel.tsx';
import styles from './pii.module.css';

interface Props {
  findings: readonly Finding[];
  flow: Flow;
  ner: { state: NerState; enabled: boolean; analysing: boolean };
  onNerLoad: () => void;
  onNerToggle: (enabled: boolean) => void;
}

/** "Under the hood" for the PII project: everything that does not have to be on the page. */
export function PiiDetails({ findings, flow, ner, onNerLoad, onNerToggle }: Props) {
  const t = cs.pii;
  const d = t.details;
  return (
    <>
      <DrawerSection title={d.findings(findings.length)}>
        <p className={styles.small}>{t.findings.minScoreNote(formatScore(DEFAULT_MIN_SCORE))}</p>
        <FindingsTable findings={findings} />
      </DrawerSection>

      <DrawerSection title={d.eval}>
        <EvalResults />
      </DrawerSection>

      <DrawerSection title={d.limits}>
        <ul className={styles.list}>
          {t.limits.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </DrawerSection>

      <DrawerSection title={d.managed}>
        <div className={styles.compare}>
          {[t.managed.own, t.managed.managedService].map((option) => (
            <div key={option.heading} className={styles.compareCard}>
              <h4>{option.heading}</h4>
              <p className={styles.groupLabel}>{t.managed.prosLabel}</p>
              <ul className={styles.pros}>
                {option.pros.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className={styles.groupLabel}>{t.managed.consLabel}</p>
              <ul className={styles.cons}>
                {option.cons.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p>{t.managed.recommendation}</p>
      </DrawerSection>

      <DrawerSection title={d.map}>
        {flow.entries.length === 0 ? (
          <p className={styles.muted}>{t.machine.none}</p>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.caption}>{t.reversible.mapHeading}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t.reversible.mapColumns.placeholder}</th>
                    <th scope="col">{t.reversible.mapColumns.type}</th>
                    <th scope="col">{t.reversible.mapColumns.original}</th>
                  </tr>
                </thead>
                <tbody>
                  {flow.entries.map((e) => (
                    <tr key={e.placeholder}>
                      <td>
                        <code>{e.placeholder}</code>
                      </td>
                      <td>{t.types[e.type]}</td>
                      <td>
                        <code>{e.original}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.small}>{t.reversible.mapNote}</p>
            <TracePanel events={flow.events} title={t.reversible.traceTitle} headingLevel={3} />
          </>
        )}
      </DrawerSection>

      <DrawerSection title={d.ner}>
        <NerPanel
          state={ner.state}
          enabled={ner.enabled}
          analysing={ner.analysing}
          onLoad={onNerLoad}
          onToggle={onNerToggle}
        />
      </DrawerSection>
    </>
  );
}
