import { Link } from 'react-router';
import { cs } from '../../i18n/cs.ts';
import type { ModuleMeta } from '../../modules/registry.ts';
import styles from './ModuleCard.module.css';

export function ModuleCard({ module }: { module: ModuleMeta }) {
  const texts = cs.modules[module.id];
  return (
    <article className={styles.card} data-testid="module-card">
      <div className={styles.top}>
        <span className={styles.number} aria-hidden="true">
          {module.number}
        </span>
        <span className={styles.status}>{cs.status.planned(module.phase)}</span>
      </div>
      <h3 className={styles.title}>
        <Link
          to={module.path}
          className={styles.link}
          aria-label={cs.landing.openModule(texts.title)}
        >
          {texts.title}
        </Link>
      </h3>
      <p className={styles.question}>{texts.question}</p>
      <p className={styles.summary}>{texts.summary}</p>
      <p className={styles.proof}>
        <strong>{cs.landing.proofLabel}:</strong> {texts.proof}
      </p>
    </article>
  );
}
