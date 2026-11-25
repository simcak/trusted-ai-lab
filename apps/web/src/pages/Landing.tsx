import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { cs } from '../i18n/cs.ts';
import { MODULES } from '../modules/registry.ts';
import { HeroScene } from './landing/HeroScene.tsx';
import { ComingSoon, ProjectCard } from './landing/ProjectCard.tsx';
import styles from './Landing.module.css';

export function Landing() {
  useDocumentTitle();
  return (
    <div className={styles.landing}>
      <HeroScene />

      <section id="projects" className={styles.projects} aria-labelledby="projects-heading">
        <header className={styles.projectsHeader}>
          <h2 id="projects-heading" tabIndex={-1}>
            {cs.landing.galleryHeading}
          </h2>
          <p>{cs.landing.galleryLead}</p>
        </header>
        <ul className={styles.grid}>
          {MODULES.filter((m) => m.status === 'ready').map((m) => (
            <li key={m.id}>
              <ProjectCard project={m} />
            </li>
          ))}
        </ul>
        <ComingSoon />
      </section>
    </div>
  );
}
