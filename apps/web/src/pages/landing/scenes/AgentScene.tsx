import { memo } from 'react';
import { paint } from '../../../pixel/palette.ts';
import { rectPath } from '../../../pixel/pixel-art.ts';
import { Backdrop } from '../../../pixel/scenes/Backdrop.tsx';
import { place, WORLD } from '../../../pixel/scenes/kit.ts';
import styles from '../../../pixel/scenes/scenes.module.css';
import { Sprite } from '../../../pixel/Sprite.tsx';
import { envelope, gremlin, shieldGlow, spark } from '../../../pixel/sprites/hero.ts';
import { guardShield, questionMark } from '../../../pixel/sprites/icons.ts';
import {
  approver,
  bigCalc,
  cabinet,
  mailbox,
  tick,
  walker,
} from '../../../pixel/sprites/scenes.ts';
import { POS, GUARD, shifted } from './agent-timeline.ts';

/** The scene's world; its moving parts carry `data-part` (timeline in agent-timeline.ts). */
export const AgentWorld = memo(function AgentWorld() {
  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <Backdrop road={[14, 330]} />
      <g transform={place(POS.cabinet)}>
        <Sprite sprite={cabinet} scale={1} />
      </g>
      <path
        data-part="search"
        fill={paint('px-glow-1')}
        d={rectPath(102, 130, 12, 6)}
        opacity={0}
      />
      <g transform={place(POS.calc)}>
        <Sprite sprite={bigCalc} scale={1} />
      </g>
      <path
        data-part="compute"
        fill={paint('px-glow-1')}
        d={rectPath(192, 130, 12, 6)}
        opacity={0}
      />
      <g transform={place(POS.mailbox)}>
        <Sprite sprite={mailbox} scale={1} />
      </g>
      <g transform={place(POS.approver)}>
        <Sprite sprite={approver} scale={1} />
      </g>
      <g data-part="guard" transform={place(shifted(POS.atMail, GUARD))}>
        <Sprite sprite={guardShield} scale={1} />
      </g>
      <g data-part="gremlin" transform={place(POS.inArchive)} opacity={0}>
        <Sprite sprite={gremlin} scale={1} fps={5} />
      </g>
      <g data-part="shield" transform={place(POS.shield)} opacity={0}>
        <Sprite sprite={shieldGlow} scale={1} />
      </g>
      <g data-part="spark" transform={place(POS.spark)} opacity={0}>
        <Sprite sprite={spark} scale={1} fps={6} />
      </g>
      <g data-part="robot" transform={place(POS.atMail)}>
        <Sprite sprite={walker} scale={1} fps={6} />
      </g>
      <g data-part="letter" transform={place(POS.handed)}>
        <Sprite sprite={envelope} scale={1} />
      </g>
      <g data-part="question" transform={place(POS.question)} opacity={0}>
        <Sprite sprite={questionMark} scale={1} fps={3} />
      </g>
      <g data-part="tick" transform={place(POS.tick)}>
        <Sprite sprite={tick} scale={1} />
      </g>
    </svg>
  );
});
