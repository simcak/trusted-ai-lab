import { memo, type CSSProperties } from 'react';
import { paint, type PaletteKey } from '../palette.ts';
import { circlePath, ditherPath, hillPath, rectPath } from '../pixel-art.ts';
import { Sprite } from '../Sprite.tsx';
import { cloud } from '../sprites/hero.ts';
import { WORLD } from './kit.ts';
import styles from './scenes.module.css';

const { w: W } = WORLD;

const SKY: Array<[PaletteKey, string]> = [
  ['scene-sky-0', rectPath(0, 0, W, 60)],
  ['scene-sky-1', rectPath(0, 60, W, 36) + ditherPath(0, 56, W, 4)],
  ['scene-sky-2', rectPath(0, 96, W, 26) + ditherPath(0, 92, W, 4, 1)],
  ['scene-sky-3', rectPath(0, 122, W, 30) + ditherPath(0, 118, W, 4)],
];

const HILLS: Array<[PaletteKey, string]> = [
  [
    'scene-hill-far',
    hillPath({
      width: W,
      base: 124,
      bottom: 152,
      waves: [
        [7, 130, 0.5],
        [3, 41, 1.2],
      ],
    }),
  ],
  [
    'scene-hill-mid',
    hillPath({
      width: W,
      base: 136,
      bottom: 152,
      waves: [
        [5, 90, 2],
        [2, 27, 0.3],
      ],
    }),
  ],
  [
    'scene-hill-near',
    hillPath({
      width: W,
      base: 145,
      bottom: 152,
      waves: [
        [3, 60, 1],
        [1.5, 19, 2],
      ],
    }),
  ],
  ['scene-ground', rectPath(0, 148, W, 32)],
  ['scene-ground-dark', rectPath(0, 166, W, 14) + ditherPath(0, 164, W, 2)],
];

interface Star {
  x: number;
  y: number;
  big: boolean;
  twinkle: boolean;
  delay: number;
}

const STARS: Star[] = (() => {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars: Star[] = [];
  for (let i = 0; i < 60; i += 1) {
    const star = {
      x: Math.floor(rnd() * W),
      y: Math.floor(rnd() * 112),
      big: rnd() > 0.85,
      twinkle: rnd() > 0.55,
      delay: rnd() * 4,
    };
    if (Math.hypot(star.x - 352, star.y - 58) > 20) stars.push(star);
  }
  return stars;
})();

const starPath = (s: Star) =>
  s.big ? rectPath(s.x, s.y - 1, 1, 3) + rectPath(s.x - 1, s.y, 3, 1) : rectPath(s.x, s.y, 1, 1);

const CLOUDS = [
  { x: 40, y: 64, duration: 110 },
  { x: 230, y: 44, duration: 150 },
  { x: 330, y: 84, duration: 130 },
];

/**
 * The shared world behind every scene: sky (day or night from the theme), stars, the sun or
 * moon, drifting clouds, hills and the ground, plus a road segment `[x, width]` if given.
 */
export const Backdrop = memo(function Backdrop({ road }: { road?: readonly [number, number] }) {
  return (
    <>
      {SKY.map(([fill, d]) => (
        <path key={fill} fill={paint(fill)} d={d} />
      ))}
      <g className={styles.stars}>
        <path
          fill={paint('scene-star')}
          d={STARS.filter((s) => !s.twinkle)
            .map(starPath)
            .join('')}
        />
        {STARS.filter((s) => s.twinkle).map((s, i) => (
          <path
            key={i}
            className={styles.twinkle}
            style={{ animationDelay: `${s.delay}s` }}
            fill={paint('scene-star')}
            d={starPath(s)}
          />
        ))}
      </g>
      <path fill={paint('scene-orb-halo')} d={circlePath(352, 58, 14)} opacity={0.6} />
      <path fill={paint('scene-orb')} d={circlePath(352, 58, 9)} />
      {CLOUDS.map((c) => (
        <g key={c.x} transform={`translate(${c.x} ${c.y})`}>
          <g
            className={styles.cloud}
            style={{ '--x0': `${c.x}px`, animationDuration: `${c.duration}s` } as CSSProperties}
          >
            <Sprite sprite={cloud} scale={1} />
          </g>
        </g>
      ))}
      {HILLS.map(([fill, d]) => (
        <path key={fill} fill={paint(fill)} d={d} />
      ))}
      {road && (
        <>
          <path fill={paint('scene-path')} d={rectPath(road[0], 150, road[1], 4)} />
          <path fill={paint('scene-path-dark')} d={rectPath(road[0], 154, road[1], 1)} />
        </>
      )}
    </>
  );
});
