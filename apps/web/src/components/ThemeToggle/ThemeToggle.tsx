import { cs } from '../../i18n/cs.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { moon, sun } from '../../pixel/sprites/icons.ts';
import { useTheme } from '../../theme/theme.ts';
import styles from './ThemeToggle.module.css';

/** A pixel switch: sun and moon side by side, the knob sits on the active theme. */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={cs.theme.dark}
      title={dark ? cs.theme.toLight : cs.theme.toDark}
      className={styles.toggle}
      data-theme-state={theme}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <span className={styles.knob} aria-hidden="true" />
      <span className={styles.icon}>
        <Sprite sprite={sun} scale={2} />
      </span>
      <span className={styles.icon}>
        <Sprite sprite={moon} scale={2} />
      </span>
    </button>
  );
}
