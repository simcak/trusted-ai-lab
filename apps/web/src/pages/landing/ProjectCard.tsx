import { Link } from 'react-router';
import { cs } from '../../i18n/cs.ts';
import type { ModuleMeta } from '../../modules/registry.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { cartridge } from '../../pixel/sprites/icons.ts';
import styles from './ProjectCard.module.css';

/** A project in the gallery, styled as a game cartridge; the thumbnail plays on hover/focus. */
export function ProjectCard({ project }: { project: ModuleMeta }) {
  const t = cs.modules[project.id];
  return (
    <article
      className={styles.card}
      data-testid="module-card"
      data-accent={project.accent}
      data-sprite-host
    >
      <div className={styles.thumb}>
        <Sprite sprite={project.thumb} scale={4} fps={3} play="hover" />
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link
            to={project.path}
            className={styles.link}
            aria-label={cs.landing.openProject(t.title)}
          >
            {t.title}
          </Link>
        </h3>
        <p className={styles.question}>{t.question}</p>
        <p className={styles.text}>{t.card}</p>
        <ul className={styles.tags} aria-label={cs.landing.tagsLabel}>
          {project.tags.map((tag) => (
            <li key={tag} className="px-chip">
              {cs.tags[tag]}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/** "More projects are coming": a slim strip under the gallery, not a link. */
export function ComingSoon() {
  return (
    <div className={styles.soon} data-accent="steel">
      <Sprite sprite={cartridge} scale={2} />
      <p>
        <strong>{cs.landing.comingSoon.title}</strong> {cs.landing.comingSoon.text}
      </p>
    </div>
  );
}
