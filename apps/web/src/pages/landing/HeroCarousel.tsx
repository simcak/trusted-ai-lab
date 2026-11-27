import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { cs } from '../../i18n/cs.ts';
import { getModule } from '../../modules/registry.ts';
import type { SceneTimeline } from '../../pixel/scene.ts';
import { WORLD } from '../../pixel/scenes/kit.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { pauseMark, playMark } from '../../pixel/sprites/icons.ts';
import { useScene } from '../../pixel/useScene.ts';
import { useStageScale } from '../../pixel/useStageScale.ts';
import { SCENES } from './scenes/index.ts';
import styles from './HeroCarousel.module.css';

const { w: W, h: H } = WORLD;

/** Each scene's timeline plus the active tab's progress bar; module-level, so stable. */
const BUILDERS = SCENES.map((scene) => (root: Element): SceneTimeline => {
  const timeline = scene.timeline(root);
  const bar = root.querySelector('[data-part="progress"]');
  return {
    ...timeline,
    tracks: [
      ...timeline.tracks,
      {
        target: bar,
        keys: [
          [0, { transform: 'scaleX(0)' }],
          [timeline.duration, { transform: 'scaleX(1)' }],
        ],
      },
    ],
  };
});

/**
 * Landing hero: four short pixel scenes, one per project, each played once before the next.
 * The scene is the pause control (click, Enter or Space; WCAG 2.2.2), which also stops the
 * rotation. Under it, one button per project switches the scene; the link opens the project
 * of the scene on screen. With reduced motion each scene is a still frame and nothing rotates.
 */
export function HeroCarousel() {
  const t = cs.landing.hero;
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  useStageScale(stageRef, worldRef, W, H);
  const [index, setIndex] = useState(0);
  const next = useCallback(() => setIndex((i) => (i + 1) % SCENES.length), []);
  const { status, toggle } = useScene(rootRef, BUILDERS[index]!, { once: true, onFinish: next });
  const playing = status === 'playing';

  const scene = SCENES[index]!;
  const meta = getModule(scene.id);
  const texts = cs.landing.scenes[scene.id];
  const places = texts.places as Record<string, string>;
  const World = scene.World;

  const choose = (i: number) => {
    setIndex(i);
    if (status === 'paused') toggle();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggle();
  };

  return (
    <section
      ref={rootRef}
      className={styles.hero}
      aria-labelledby="hero-title"
      data-paused={playing ? undefined : ''}
      data-static={status === 'static' ? '' : undefined}
      data-accent={meta.accent}
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

      <div
        ref={stageRef}
        className={styles.stage}
        role="button"
        tabIndex={0}
        aria-label={playing ? t.pause : t.play}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        <div ref={worldRef} className={styles.world}>
          <div key={scene.id} className={styles.scene} data-scene={scene.id}>
            <World />
            <ul className={styles.places} aria-hidden="true">
              {scene.places.map((p) => (
                <li key={p.key} style={{ left: `${(p.x / W) * 100}%` }}>
                  {places[p.key]}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <span className={styles.playState} aria-hidden="true">
          <Sprite sprite={playing ? pauseMark : playMark} scale={3} />
        </span>
      </div>

      <div className={styles.dialog}>
        <div className={styles.captions} aria-hidden="true" key={scene.id}>
          {texts.captions.map((text, i) => (
            <p key={text} data-part={`caption-${i}`} className={i === 0 ? undefined : styles.later}>
              {text}
            </p>
          ))}
        </div>
        <p className="visually-hidden">{texts.description}</p>
        <div className={styles.controls}>
          <div className={styles.tabs} role="group" aria-label={t.scenesLabel}>
            {SCENES.map((s, i) => {
              const m = getModule(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  className={styles.tab}
                  data-accent={m.accent}
                  data-sprite-host
                  aria-pressed={i === index}
                  onClick={() => choose(i)}
                >
                  <Sprite sprite={m.thumb} scale={1} play="hover" />
                  <span>{cs.modules[s.id].nav}</span>
                  {i === index && <span className={styles.progress} data-part="progress" />}
                </button>
              );
            })}
          </div>
          <Link to={meta.path} className={`button ${styles.cta}`}>
            {t.cta}{' '}
            <span className="visually-hidden">{t.ctaProject(cs.modules[scene.id].title)}</span>
            <span aria-hidden="true"> →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
