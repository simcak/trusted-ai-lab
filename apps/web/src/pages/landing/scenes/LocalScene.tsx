import { memo } from 'react';
import { paint } from '../../../pixel/palette.ts';
import { circlePath, ditherPath, rectPath } from '../../../pixel/pixel-art.ts';
import { Backdrop } from '../../../pixel/scenes/Backdrop.tsx';
import { place, WORLD } from '../../../pixel/scenes/kit.ts';
import styles from '../../../pixel/scenes/scenes.module.css';
import { Sprite } from '../../../pixel/Sprite.tsx';
import { antenna, chart, watch } from '../../../pixel/sprites/actors.ts';
import { house, thinking, tower } from '../../../pixel/sprites/hero.ts';
import { questionMark } from '../../../pixel/sprites/icons.ts';
import { localThumb } from '../../../pixel/sprites/projects.ts';
import { runner, tick } from '../../../pixel/sprites/scenes.ts';
import { crossPath, zeroPath } from './types.ts';
import { POS, DOME, WIRE, LEDS, LED_COLOURS } from './local-timeline.ts';

/** The scene's world; its moving parts carry `data-part` (timeline in local-timeline.ts). */
export const LocalWorld = memo(function LocalWorld() {
  const [winX, winY] = POS.window;
  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${WORLD.w} ${WORLD.h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <Backdrop road={[44, 196]} />
      <g transform={place(POS.tower)}>
        <Sprite sprite={tower} scale={1} />
      </g>
      {LEDS.map((y, i) => (
        <path
          key={y}
          className={styles.led}
          style={{ animationDuration: `${1.2 + (i % 3) * 0.7}s`, animationDelay: `${i * 0.3}s` }}
          fill={paint(LED_COLOURS[i % 3]!)}
          d={rectPath(329, y, 2, 2)}
        />
      ))}
      <g data-part="wire">
        <path fill={paint('scene-star')} opacity={0.5} d={WIRE} />
        <path fill={paint('px-ember-1')} d={crossPath(196, 99, 11)} />
      </g>
      <g data-part="question" transform={place(POS.question)}>
        <Sprite sprite={questionMark} scale={1} fps={3} />
      </g>

      <path
        data-part="dome"
        className={styles.domeFill}
        fill={paint('px-glow-1')}
        d={circlePath(DOME.x, DOME.y, DOME.r - 1, { top: true })}
      />
      <g transform={place(POS.house)}>
        <Sprite sprite={house} scale={1} />
      </g>
      <path
        className={styles.windowGlow}
        fill={paint('scene-window')}
        d={circlePath(winX, winY, 9)}
      />
      <g transform={place(POS.antenna)}>
        <Sprite sprite={antenna} scale={1} />
      </g>
      <g data-part="zero">
        <path className={styles.led} fill={paint('px-leaf-2')} d={rectPath(66, 112, 2, 2)} />
        <path fill={paint('px-leaf-2')} d={zeroPath(70, 110)} />
      </g>
      <g transform={place(POS.laptop)}>
        <Sprite sprite={localThumb} scale={1} />
      </g>
      <path
        data-part="screen"
        fill={paint('px-glow-1')}
        d={rectPath(96, 129, 23, 13)}
        opacity={0}
      />
      <path
        data-part="fog"
        fill={paint('scene-cloud')}
        opacity={0.75}
        d={ditherPath(28, 138, 40, 16) + ditherPath(30, 140, 36, 12, 1)}
      />
      <path
        data-part="dome-ring"
        fill={paint('px-glow-1')}
        opacity={0.6}
        d={circlePath(DOME.x, DOME.y, DOME.r, { ring: true, top: true })}
      />
      <g data-part="runner" transform={place(POS.back)}>
        <Sprite sprite={runner} scale={1} fps={8} />
      </g>
      <g data-part="watch" transform={place(POS.watch)} opacity={0}>
        <Sprite sprite={watch} scale={1} />
      </g>
      <g data-part="data" transform={place(POS.screen)} opacity={0}>
        <Sprite sprite={chart} scale={1} />
      </g>
      <g data-part="bubble" transform={place(POS.bubble)} opacity={0}>
        <Sprite sprite={thinking} scale={1} fps={4} />
      </g>
      <g data-part="tick" transform={place(POS.tick)}>
        <Sprite sprite={tick} scale={1} />
      </g>
    </svg>
  );
});
