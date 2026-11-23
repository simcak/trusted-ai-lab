import { ModuleCard } from '../components/ModuleCard/ModuleCard.tsx';
import { DOCS_URL, REPO_URL } from '../config.ts';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { cs } from '../i18n/cs.ts';
import { MODULES } from '../modules/registry.ts';
import styles from './Landing.module.css';

export function Landing() {
  useDocumentTitle();
  return (
    <div className={styles.landing}>
      <header className={styles.hero}>
        <h1>{cs.app.name}</h1>
        <p className={styles.lead}>{cs.landing.lead}</p>
        <p className={styles.sublead}>{cs.landing.sublead}</p>
      </header>

      <section aria-labelledby="story-heading">
        <h2 id="story-heading" className={styles.sectionHeading}>
          {cs.landing.storyHeading}
        </h2>
        <ol className={styles.grid}>
          {MODULES.map((m) => (
            <li key={m.id}>
              <ModuleCard module={m} />
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="more-heading" className={styles.more}>
        <h2 id="more-heading" className={styles.sectionHeading}>
          {cs.landing.moreHeading}
        </h2>
        <ul>
          <li>
            <a href={DOCS_URL}>{cs.landing.docsLink}</a>
          </li>
          <li>
            <a href={REPO_URL}>{cs.landing.githubLink}</a>
          </li>
        </ul>
      </section>
    </div>
  );
}
