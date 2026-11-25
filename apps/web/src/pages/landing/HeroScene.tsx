import { memo, useRef, type CSSProperties } from 'react';
import { cs } from '../../i18n/cs.ts';
import { paint, type PaletteKey } from '../../pixel/palette.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { circlePath, ditherPath, hillPath, rectPath } from '../../pixel/pixel-art.ts';
import {
  cloud,
  envelope,
  gate,
  gremlin,
  heart,
  house,
  idBadge,
  maskBadge,
  replyBadge,
  shieldGlow,
  spark,
  thinking,
  tower,
} from '../../pixel/sprites/hero.ts';
import { usePrefersReducedMotion, useScene } from '../../pixel/useScene.ts';
import { useStageScale } from '../../pixel/useStageScale.ts';
import { POS, WORLD, heroTimeline } from './hero-timeline.ts';
import styles from './HeroScene.module.css';

const { w: W, h: H } = WORLD;

/* Static layers, computed once. */
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
  ['scene-path', rectPath(80, 150, 262, 4)],
  ['scene-path-dark', rectPath(80, 154, 262, 1)],
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

const [domeX, domeY, domeR] = POS.dome;
const DOME_RING = circlePath(domeX, domeY, domeR, { ring: true, top: true });
const DOME_FILL = circlePath(domeX, domeY, domeR - 1, { top: true });
const [winX, winY] = POS.window;
const LEDS = [116, 122, 128, 134, 140, 146];
const LED_COLOURS: PaletteKey[] = ['px-leaf-2', 'px-sky-2', 'px-sun-2'];

const at = ([x, y]: readonly [number, number] | readonly number[]) => `translate(${x} ${y})`;

/** The SVG world. Memoised: it never re-renders when the play state changes. */
const HeroWorld = memo(function HeroWorld() {
  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
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
        <g key={c.x} transform={at([c.x, c.y])}>
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

      <path
        data-part="dome"
        className={styles.domeFill}
        fill={paint('px-glow-1')}
        d={DOME_FILL}
        opacity={0.6}
      />
      <g transform={at(POS.house)}>
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

      <g transform={at(POS.gate)}>
        <Sprite sprite={gate} scale={1} />
      </g>
      <path
        data-part="field"
        fill={paint('px-glow-1')}
        d={rectPath(191, 122, 18, 27)}
        opacity={0.35}
      />
      <path
        data-part="beam"
        fill={paint('px-glow-1')}
        d={rectPath(191, 0, 18, 2)}
        opacity={0}
        transform="translate(0 122)"
      />
      <g data-part="shield-flash" transform={at(POS.shield)} opacity={0}>
        <Sprite sprite={shieldGlow} scale={1} />
      </g>

      <g transform={at(POS.tower)}>
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
      <g data-part="bubble" transform={at(POS.bubble)} opacity={0}>
        <Sprite sprite={thinking} scale={1} fps={4} />
      </g>

      <g data-part="letter" transform={at(POS.atGate)}>
        <Sprite sprite={envelope} scale={1} />
        <g data-part="letter-id" transform="translate(8 5)" opacity={0}>
          <Sprite sprite={idBadge} scale={1} />
        </g>
        <g data-part="letter-mask" transform="translate(8 5)">
          <Sprite sprite={maskBadge} scale={1} />
        </g>
      </g>
      <g data-part="reply" transform={at(POS.mouth)} opacity={0}>
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
      <g data-part="gremlin" transform={at(POS.gremlin)}>
        <Sprite sprite={gremlin} scale={1} fps={5} />
      </g>
      <g data-part="spark" transform={at(POS.spark)}>
        <Sprite sprite={spark} scale={1} fps={6} />
      </g>

      <path
        data-part="dome-ring"
        className={styles.domeRing}
        fill={paint('px-glow-1')}
        d={DOME_RING}
        opacity={0.6}
      />
      <g data-part="heart" transform={at(POS.heart)}>
        <Sprite sprite={heart} scale={1} />
      </g>
    </svg>
  );
});

/**
 * Landing hero: a looping pixel scene that tells the site's story in four beats — your
 * message, masked before it reaches the AI, the reply checked by rules on the way back, and
 * sensitive data staying home. Captions run in sync; the scene pauses on demand.
 */
export function HeroScene() {
  const t = cs.landing.hero;
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  useStageScale(stageRef, worldRef, W, H);
  const { status, toggle } = useScene(rootRef, heroTimeline);
  const reduced = usePrefersReducedMotion();

  const goToProjects = () => {
    const target = document.getElementById('projects');
    target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    target?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  };

  return (
    <section
      ref={rootRef}
      className={styles.hero}
      aria-labelledby="hero-title"
      data-paused={status === 'playing' ? undefined : ''}
    >
      <div className={styles.intro}>
        <h1 id="hero-title">{cs.app.name}</h1>
        <p className={styles.lead}>{cs.landing.lead}</p>
        <ul className={styles.facts}>
          {cs.landing.facts.map((fact) => (
            <li key={fact} className="px-chip">
              {fact}
            </li>
          ))}
        </ul>
      </div>

      <div ref={stageRef} className={styles.stage}>
        <div ref={worldRef} className={styles.world}>
          <HeroWorld />
          <ul className={styles.places} aria-hidden="true">
            <li style={{ left: `${(96 / W) * 100}%` }}>{t.places.device}</li>
            <li style={{ left: `${(200 / W) * 100}%` }}>{t.places.guard}</li>
            <li style={{ left: `${(320 / W) * 100}%` }}>{t.places.model}</li>
          </ul>
        </div>
      </div>

      <div className={styles.dialog}>
        <div className={styles.captions} aria-hidden="true">
          {t.captions.map((text, i) => (
            <p key={text} data-part={`caption-${i}`} className={i === 0 ? undefined : styles.later}>
              {text}
            </p>
          ))}
        </div>
        <p className="visually-hidden">{t.description}</p>
        <div className={styles.controls}>
          <button type="button" className="button button--secondary" onClick={toggle}>
            {status === 'playing' ? t.pause : t.play}
          </button>
          <button type="button" className="button" onClick={goToProjects}>
            {t.cta} <span aria-hidden="true">↓</span>
          </button>
        </div>
      </div>
    </section>
  );
}
