import type { Persona } from '@trusted-ai-lab/agent-runtime';
import type { ReactNode } from 'react';
import machine from '../../../components/Machine/machine.module.css';
import { cs } from '../../../i18n/cs.ts';
import type { SpriteDef } from '../../../pixel/pixel-art.ts';
import { Sprite } from '../../../pixel/Sprite.tsx';
import {
  advisor,
  calculator,
  flag,
  magnifier,
  person,
  robot,
} from '../../../pixel/sprites/actors.ts';
import { envelope } from '../../../pixel/sprites/hero.ts';
import { guardShield, lock } from '../../../pixel/sprites/icons.ts';
import styles from '../agent.module.css';
import type { Actor, Beat, BeatIcon } from './beats.ts';

const ACTORS: Actor[] = ['user', 'model', 'rules', 'tools'];
const COLUMN: Record<Actor, number> = { user: 1, model: 2, rules: 3, tools: 4 };

const iconFor = (icon: BeatIcon, persona: Persona): SpriteDef => {
  switch (icon) {
    case 'person':
      return persona === 'poradce' ? advisor : person;
    case 'robot':
      return robot;
    case 'shield':
      return guardShield;
    case 'lock':
      return lock;
    case 'search_funds':
      return magnifier;
    case 'calculate_fees':
      return calculator;
    case 'draft_email':
      return envelope;
    case 'flag':
      return flag;
  }
};

const HEAD_ICON: Record<Actor, BeatIcon> = {
  user: 'person',
  model: 'robot',
  rules: 'shield',
  tools: 'search_funds',
};

interface Props {
  beats: readonly Beat[];
  guardrails: boolean;
  persona: Persona;
  /** Shown while nothing has run yet: the start button or „not recorded“. */
  idle: ReactNode;
}

/**
 * The run as a sequence diagram: four lifelines (person, model, rules, tools) and one row per
 * step, placed under whoever acts. Rows appear as the trace grows. With the guardrails off the
 * rules lifeline goes grey and stays empty.
 */
export function RunLane({ beats, guardrails, persona, idle }: Props) {
  const t = cs.agent.lane;
  return (
    <div className={styles.lane} data-guardrails={guardrails ? 'on' : 'off'}>
      <div className={styles.laneHead} aria-hidden="true">
        {ACTORS.map((actor) => (
          <span key={actor} className={styles.actor} data-actor={actor}>
            <Sprite sprite={iconFor(HEAD_ICON[actor], persona)} scale={2} />
            <span>{t.actors[actor]}</span>
            {actor === 'rules' && !guardrails && (
              <span className={styles.actorOff}>{t.rulesOff}</span>
            )}
          </span>
        ))}
      </div>
      <div className={styles.lifelines} aria-hidden="true">
        {ACTORS.map((actor) => (
          <span key={actor} data-actor={actor} />
        ))}
      </div>
      {beats.length === 0 ? (
        <div className={styles.laneIdle}>{idle}</div>
      ) : (
        <ol className={styles.beats} aria-label={t.label}>
          {beats.map((beat, i) => (
            <BeatRow key={beat.id} beat={beat} row={i + 1} persona={persona} />
          ))}
        </ol>
      )}
    </div>
  );
}

function BeatRow({ beat, row, persona }: { beat: Beat; row: number; persona: Persona }) {
  const t = cs.agent.lane;
  const column =
    beat.tone === 'end'
      ? '1 / -1'
      : beat.checked
        ? `${COLUMN.rules} / ${COLUMN.tools + 1}`
        : String(COLUMN[beat.actor]);
  return (
    <li
      className={`${styles.beat} ${machine.popIn}`}
      data-actor={beat.actor}
      data-tone={beat.tone}
      data-status={beat.status}
      data-checked={beat.checked ? '' : undefined}
      data-testid="agent-beat"
      style={{ gridColumn: column, gridRow: row }}
    >
      {beat.checked && (
        <span className={styles.check}>
          <Sprite sprite={guardShield} scale={1} />
          {t.checked}
        </span>
      )}
      <span className={styles.beatBox}>
        <span className={styles.beatIcon} aria-hidden="true">
          <Sprite sprite={iconFor(beat.icon, persona)} scale={beat.icon === 'lock' ? 2 : 1} />
        </span>
        <span className={styles.beatText}>
          <span className={styles.beatActor}>{t.actors[beat.actor]}: </span>
          {beat.text}
          {beat.chips?.map((chip) => (
            <code key={chip} className={styles.beatChip}>
              {chip}
            </code>
          ))}
          {beat.note && <span className={styles.beatNote}>{beat.note}</span>}
        </span>
      </span>
    </li>
  );
}
