import { cs } from '../../../i18n/cs.ts';
import type { NetworkPhase, NetworkSnapshot } from '../network/network-monitor.ts';
import styles from '../local.module.css';

const PHASES: NetworkPhase[] = ['page', 'model', 'afterFile'];

export function NetworkPanel({ snapshot }: { snapshot: NetworkSnapshot }) {
  const t = cs.local.network;
  const after = snapshot.counts.afterFile;
  const chosen = snapshot.fileSelectedAt !== undefined;
  return (
    <section
      className={styles.section}
      aria-labelledby="network-heading"
      data-testid="network-panel"
    >
      <h2 id="network-heading">{t.heading}</h2>
      <p>{t.intro}</p>

      <div className={`${styles.counter} ${chosen && after === 0 ? styles.counterZero : ''}`}>
        <span className={styles.groupLabel}>{t.counterLabel}</span>
        <strong className={styles.counterValue} data-testid="network-after-file">
          {chosen ? after : '–'}
        </strong>
        <span>{!chosen ? t.beforeFile : after === 0 ? t.zero : t.nonZero}</span>
      </div>

      <ol className={styles.phases}>
        {PHASES.map((phase) => (
          <li key={phase} className={styles.phase}>
            <strong>{t.phases[phase]}</strong>: {t.requests(snapshot.counts[phase])}
            <span className={styles.small}>{t.phaseHints[phase]}</span>
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
      <p className={styles.small}>{t.caveat}</p>
    </section>
  );
}
