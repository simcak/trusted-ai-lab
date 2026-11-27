import { getRule, type IntakeResult } from '@trusted-ai-lab/intake-rules';
import type { CSSProperties } from 'react';
import { InfoTip } from '../../components/InfoTip/InfoTip.tsx';
import machine from '../../components/Machine/machine.module.css';
import { cs } from '../../i18n/cs.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { person } from '../../pixel/sprites/actors.ts';
import { ladderOf, nobodyFits, type Rung } from './ladder.ts';
import { PATTERN_ICON } from './look.ts';
import styles from './intake.module.css';

const t = cs.intake.ladder;

/**
 * The engine's choice made visible: patterns from the simplest, the excluded ones crossed out
 * (click: why), the winner lit, the more complex ones that would fit greyed out as needless.
 */
export function PatternLadder({ result }: { result: IntakeResult }) {
  const rungs = ladderOf(result);
  return (
    <div className={styles.ladder}>
      <div className={machine.groupLabel}>
        {t.label}
        <InfoTip label={t.tipTitle} title={t.tipTitle} icon="bulb">
          <p>{t.tip}</p>
        </InfoTip>
      </div>
      <ol className={styles.rungs} data-testid="intake-ladder">
        {rungs.map((rung, i) => (
          <li
            key={rung.pattern}
            className={styles.rung}
            data-state={rung.state}
            style={{ '--i': i } as CSSProperties}
          >
            <RungContent rung={rung} />
          </li>
        ))}
        {nobodyFits(result) && (
          <li
            className={styles.rung}
            data-state="winner"
            style={{ '--i': rungs.length } as CSSProperties}
          >
            <span className={styles.rungIcon} aria-hidden="true">
              <Sprite sprite={person} scale={2} />
            </span>
            <span className={styles.rungName}>{t.human}</span>
            <span className={styles.rungState}>{t.states.winner}</span>
          </li>
        )}
      </ol>
    </div>
  );
}

function RungContent({ rung }: { rung: Rung }) {
  const name = t.short[rung.pattern];
  const inner = (
    <>
      <span className={styles.rungIcon} aria-hidden="true">
        <Sprite sprite={PATTERN_ICON[rung.pattern]} scale={2} />
      </span>
      <span className={styles.rungName}>{name}</span>
      <span className={styles.rungState}>{t.states[rung.state]}</span>
    </>
  );
  if (rung.ruleIds.length === 0) return <span className={styles.rungBody}>{inner}</span>;
  return (
    <InfoTip
      bare
      className={styles.rungBody}
      label={t.why(name)}
      title={cs.intake.patterns[rung.pattern].label}
      text={inner}
    >
      <ul className={machine.list}>
        {rung.ruleIds.map((id) => (
          <li key={id}>{getRule(id).rationale}</li>
        ))}
      </ul>
    </InfoTip>
  );
}
