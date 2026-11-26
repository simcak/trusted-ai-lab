import { NavLink } from 'react-router';
import { cs } from '../../i18n/cs.ts';
import { MODULES } from '../../modules/registry.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import styles from './ProjectNav.module.css';

/** Tabs for switching projects from anywhere: icon + short name, the open one in its colour. */
export function ProjectNav() {
  return (
    <nav aria-label={cs.app.projectsNav} className={styles.nav}>
      <ul className={styles.list}>
        {MODULES.filter((m) => m.status === 'ready').map((m) => (
          <li key={m.id}>
            <NavLink
              to={m.path}
              className={styles.tab}
              data-accent={m.accent}
              data-sprite-host
              aria-label={cs.modules[m.id].title}
            >
              <span className={styles.icon} aria-hidden="true">
                <Sprite sprite={m.thumb} scale={1} fps={3} play="hover" />
              </span>
              <span className={styles.label} aria-hidden="true">
                {cs.modules[m.id].nav}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
