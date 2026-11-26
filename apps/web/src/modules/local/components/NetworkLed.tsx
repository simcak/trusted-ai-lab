import { InfoTip } from '../../../components/InfoTip/InfoTip.tsx';
import machine from '../../../components/Machine/machine.module.css';
import { cs } from '../../../i18n/cs.ts';
import { Sprite } from '../../../pixel/Sprite.tsx';
import { antenna } from '../../../pixel/sprites/actors.ts';
import type { NetworkPhase, NetworkSnapshot } from '../network/network-monitor.ts';
import styles from '../local.module.css';

const PHASES: NetworkPhase[] = ['page', 'model', 'afterFile'];

/**
 * The proof, always in sight: how many requests left the page after a file was chosen.
 * Grey before a choice, a green blinking zero after it, ember if anything went out.
 */
export function NetworkLed({ snapshot }: { snapshot: NetworkSnapshot }) {
  const t = cs.local.network;
  const m = cs.local.machine;
  const chosen = snapshot.fileSelectedAt !== undefined;
  const after = snapshot.counts.afterFile;
  const state = !chosen ? 'idle' : after === 0 ? 'zero' : 'sent';
  return (
    <div className={styles.led} data-state={state} data-testid="network-led">
      <span className={styles.ledAntenna} aria-hidden="true">
        <Sprite sprite={antenna} scale={2} />
      </span>
      <span className={styles.ledLabel}>{m.led}</span>
      <strong className={styles.ledValue} data-testid="network-after-file">
        {chosen ? after : '–'}
      </strong>
      <span className={styles.ledLight} aria-hidden="true" />
      <span className="visually-hidden" role="status">
        {!chosen ? t.beforeFile : after === 0 ? t.zero : t.nonZero}
      </span>
      <InfoTip label={m.ledTip} title={m.ledTip}>
        <p>{!chosen ? t.beforeFile : after === 0 ? t.zero : t.nonZero}</p>
        <dl className={machine.why}>
          {PHASES.map((phase) => (
            <div key={phase}>
              <dt>
                {t.phases[phase]}: {t.requests(snapshot.counts[phase])}
              </dt>
              <dd>{t.phaseHints[phase]}</dd>
            </div>
          ))}
        </dl>
        <p>{t.caveat}</p>
      </InfoTip>
    </div>
  );
}
