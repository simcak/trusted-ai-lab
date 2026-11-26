import machine from '../../../components/Machine/machine.module.css';
import { cs } from '../../../i18n/cs.ts';
import type { NetworkPhase, NetworkSnapshot } from '../network/network-monitor.ts';
import styles from '../local.module.css';

const PHASES: NetworkPhase[] = ['page', 'model', 'afterFile'];

/** Under the hood: every request of the page by phase, with the full list. */
export function NetworkPanel({ snapshot }: { snapshot: NetworkSnapshot }) {
  const t = cs.local.network;
  return (
    <div className={machine.section} data-testid="network-panel">
      <p>{t.intro}</p>
      <ol className={styles.phases}>
        {PHASES.map((phase) => (
          <li key={phase} className={styles.phase}>
            <strong>{t.phases[phase]}</strong>: {t.requests(snapshot.counts[phase])}
            <span className={machine.small}>{t.phaseHints[phase]}</span>
          </li>
        ))}
      </ol>
      {snapshot.entries.length > 0 && (
        <details className={styles.details}>
          <summary>{t.listLabel}</summary>
          <ul className={styles.requests}>
            {snapshot.entries.map((e) => (
              <li key={`${e.source}${e.start}${e.url}`} data-phase={e.phase}>
                <span className={styles.badge}>{t.phases[e.phase]}</span>
                {e.source === 'worker' && <span className={styles.badge}>{t.worker}</span>}
                <span className={styles.requestUrl}>
                  {e.url.length > 120 ? `${e.url.slice(0, 117)}…` : e.url}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className={machine.small}>{t.caveat}</p>
    </div>
  );
}
