import { memo } from 'react';
import { Backdrop } from '../../../pixel/scenes/Backdrop.tsx';
import { place, WORLD } from '../../../pixel/scenes/kit.ts';
import styles from '../../../pixel/scenes/scenes.module.css';
import { paint } from '../../../pixel/palette.ts';
import { circlePath, rectPath } from '../../../pixel/pixel-art.ts';
import { Sprite } from '../../../pixel/Sprite.tsx';
import {
  envelope,
  gate,
  house,
  idBadge,
  maskBadge,
  replyBadge,
  thinking,
  tower,
} from '../../../pixel/sprites/hero.ts';
import { POS, LEDS, LED_COLOURS } from './pii-timeline.ts';

/** The scene's world; its moving parts carry `data-part` (timeline in pii-timeline.ts). */
export const PiiWorld = memo(function PiiWorld() {
  const [winX, winY] = POS.window;
  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <Backdrop road={[80, 262]} />
      <g transform={place(POS.house)}>
        <Sprite sprite={house} scale={1} />
      </g>
      <path
        className={styles.windowGlow}
        fill={paint('scene-window')}
        d={circlePath(winX, winY, 9)}
      />
      <path
        data-part="window-flare"
        fill={paint('scene-window')}
        d={circlePath(winX, winY, 12)}
        opacity={0}
      />
      <g transform={place(POS.gate)}>
        <Sprite sprite={gate} scale={1} />
      </g>
      <path
        data-part="field"
        fill={paint('px-glow-1')}
        d={rectPath(191, 122, 18, 27)}
        opacity={0}
      />
      <path
        data-part="beam"
        fill={paint('px-glow-1')}
        d={rectPath(191, 0, 18, 2)}
        opacity={0}
        transform="translate(0 122)"
      />
      <g transform={place(POS.tower)}>
        <Sprite sprite={tower} scale={1} />
      </g>
      {LEDS.map((y, i) => (
        <path
          key={y}
          className={styles.led}
          style={{ animationDuration: `${1.2 + (i % 3) * 0.7}s`, animationDelay: `${i * 0.3}s` }}
          fill={paint(LED_COLOURS[i % 3]!)}
          d={rectPath(309, y, 2, 2)}
        />
      ))}
      <path
        className={styles.eyelid}
        fill={paint('px-berry-1')}
        d={rectPath(314, 100, 4, 5) + rectPath(323, 100, 4, 5)}
      />
      <g data-part="bubble" transform={place(POS.bubble)} opacity={0}>
        <Sprite sprite={thinking} scale={1} fps={4} />
      </g>
      <g data-part="letter" transform={place(POS.atGate)}>
        <Sprite sprite={envelope} scale={1} />
        <g data-part="letter-id" transform="translate(8 5)" opacity={0}>
          <Sprite sprite={idBadge} scale={1} />
        </g>
        <g data-part="letter-mask" transform="translate(8 5)">
          <Sprite sprite={maskBadge} scale={1} />
        </g>
      </g>
      <g data-part="reply" transform={place(POS.mouth)} opacity={0}>
        <Sprite sprite={envelope} scale={1} />
        <g transform="translate(8 5)">
          <g data-part="reply-mask">
            <Sprite sprite={replyBadge} scale={1} />
          </g>
          <g data-part="reply-id" opacity={0}>
            <Sprite sprite={idBadge} scale={1} />
          </g>
        </g>
      </g>
    </svg>
  );
});
