import { memo } from 'react';
import { paint } from '../../../pixel/palette.ts';
import { circlePath, rectPath } from '../../../pixel/pixel-art.ts';
import { Backdrop } from '../../../pixel/scenes/Backdrop.tsx';
import { place, WORLD } from '../../../pixel/scenes/kit.ts';
import styles from '../../../pixel/scenes/scenes.module.css';
import { Sprite } from '../../../pixel/Sprite.tsx';
import { calculator, stopSign } from '../../../pixel/sprites/actors.ts';
import { house, spark, tower } from '../../../pixel/sprites/hero.ts';
import { bulb, questionMark } from '../../../pixel/sprites/icons.ts';
import { barrier, signpost, tick } from '../../../pixel/sprites/scenes.ts';
import { crossPath } from './types.ts';
import { POS, BOARD, LEDS, LED_COLOURS } from './intake-timeline.ts';

/** The scene's world; its moving parts carry `data-part` (timeline in intake-timeline.ts). */
export const IntakeWorld = memo(function IntakeWorld() {
  const [winX, winY] = POS.window;
  const glow = ([x, y]: readonly [number, number]) => rectPath(x - 1, y - 1, 17, 9);
  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <Backdrop road={[16, 290]} />
      <g transform={place(POS.tower)}>
        <Sprite sprite={tower} scale={1} />
      </g>
      {LEDS.map((y, i) => (
        <path
          key={y}
          className={styles.led}
          style={{ animationDuration: `${1.2 + (i % 3) * 0.7}s`, animationDelay: `${i * 0.3}s` }}
          fill={paint(LED_COLOURS[i % 3]!)}
          d={rectPath(335, y, 2, 2)}
        />
      ))}
      <path
        className={styles.eyelid}
        fill={paint('px-berry-1')}
        d={rectPath(340, 100, 4, 5) + rectPath(349, 100, 4, 5)}
      />
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
      {/* A side road to the prohibited branch, behind the main road. */}
      <path
        fill={paint('scene-path')}
        d={rectPath(188, 146, 8, 2) + rectPath(194, 143, 8, 2) + rectPath(200, 140, 46, 2)}
      />
      <g transform={place(POS.barrier)}>
        <Sprite sprite={barrier} scale={1} />
      </g>
      <g transform={place(POS.stop)}>
        <Sprite sprite={stopSign} scale={1} />
      </g>
      <g transform={place(POS.post)}>
        <Sprite sprite={signpost} scale={1} />
      </g>
      <path data-part="glow-ai" fill={paint('px-glow-1')} d={glow(BOARD.ai)} opacity={0} />
      <path
        data-part="cross-ai"
        fill={paint('px-ember-1')}
        d={crossPath(BOARD.ai[0] + 4, BOARD.ai[1] - 1, 9)}
      />
      <path data-part="glow-noai" fill={paint('px-glow-1')} d={glow(BOARD.noAi)} opacity={0.5} />
      <g data-part="tick" transform={place([BOARD.noAi[0] + 17, BOARD.noAi[1]])}>
        <Sprite sprite={tick} scale={1} />
      </g>
      <g data-part="question" transform={place(POS.question)} opacity={0}>
        <Sprite sprite={questionMark} scale={1} fps={3} />
      </g>
      <g data-part="calc" transform={place(POS.calc)}>
        <Sprite sprite={calculator} scale={1} />
      </g>
      <g data-part="spark" transform={place(POS.spark)} opacity={0}>
        <Sprite sprite={spark} scale={1} fps={6} />
      </g>
      <g data-part="idea" transform={place(POS.atDoor)}>
        <Sprite sprite={bulb} scale={1} />
      </g>
    </svg>
  );
});
