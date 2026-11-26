import { useState } from 'react';
import { cs } from '../../i18n/cs.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { bulb } from '../../pixel/sprites/icons.ts';
import { usePrefersReducedMotion } from '../../pixel/useScene.ts';
import styles from './InfoTicker.module.css';

/**
 * Short tips, one at a time, typed out like the scene captions. A progress bar under the tip
 * drives the rotation (its `animationend` shows the next tip), so pausing the bar pauses the
 * rotation too: on hover, on focus and on click (WCAG 2.2.2). With reduced motion the tips do
 * not rotate on their own. Screen readers get all tips as a list.
 */
export function InfoTicker({ tips }: { tips: readonly string[] }) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  if (tips.length === 0) return null;

  const rotating = !reduced && tips.length > 1;
  const next = () => setIndex((i) => (i + 1) % tips.length);
  const tip = (
    <>
      <span className={styles.bulb} aria-hidden="true">
        <Sprite sprite={bulb} scale={2} />
      </span>
      <span key={index} className={styles.text} aria-hidden="true" data-testid="ticker-tip">
        {tips[index]}
      </span>
      {rotating && (
        <span
          key={`bar-${index}`}
          className={styles.progress}
          data-testid="ticker-progress"
          onAnimationEnd={next}
        />
      )}
    </>
  );

  return (
    <div
      className={styles.ticker}
      data-paused={paused || held ? '' : undefined}
      data-stopped={paused ? '' : undefined}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      {rotating ? (
        <button
          type="button"
          className={styles.tip}
          aria-label={paused ? cs.ticker.resume : cs.ticker.pause}
          onClick={() => setPaused((p) => !p)}
        >
          {tip}
        </button>
      ) : (
        <p className={styles.tip}>{tip}</p>
      )}
      {tips.length > 1 && (
        <button type="button" className={styles.next} aria-label={cs.ticker.next} onClick={next}>
          <span aria-hidden="true">›</span>
        </button>
      )}
      <ul className="visually-hidden" aria-label={cs.ticker.label}>
        {tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
