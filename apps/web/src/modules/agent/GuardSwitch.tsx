import { cs } from '../../i18n/cs.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { guardShield } from '../../pixel/sprites/icons.ts';
import styles from './agent.module.css';

/** The one switch that matters: the policy layer on or off. Same model, same prompt. */
export function GuardSwitch({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const t = cs.agent.run;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={t.guardrails}
      className={styles.guard}
      data-on={on ? '' : undefined}
      onClick={() => onChange(!on)}
    >
      <span className={styles.guardShield} aria-hidden="true">
        <Sprite sprite={guardShield} scale={3} />
      </span>
      <span className={styles.guardLabel} aria-hidden="true">
        {t.guardrails}
      </span>
      <span className={styles.guardTrack} aria-hidden="true">
        <span className={styles.guardKnob} />
      </span>
      <span className={styles.guardState} aria-hidden="true">
        {on ? t.switchOn : t.switchOff}
      </span>
    </button>
  );
}
