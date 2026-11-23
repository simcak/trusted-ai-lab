import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { cs } from '../../i18n/cs.ts';
import { MODULES, getModule, getNeighbours, type ModuleId } from '../../modules/registry.ts';
import styles from './ModulePlaceholder.module.css';

interface Props {
  id: ModuleId;
  /** Optional extra content, e.g. a component preview. */
  children?: ReactNode;
}

export function ModulePlaceholder({ id, children }: Props) {
  const meta = getModule(id);
  const texts = cs.modules[id];
  const { prev, next } = getNeighbours(id);
  useDocumentTitle(texts.title);

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{cs.placeholder.moduleOf(meta.number, MODULES.length)}</p>
        <h1>{texts.title}</h1>
        <p className={styles.question}>{texts.question}</p>
        <p className={styles.summary}>{texts.summary}</p>
        <p className={styles.notice}>
          <span className={styles.status}>{cs.status.planned(meta.phase)}</span>
          {cs.placeholder.notice}
        </p>
      </header>

      <div className={styles.columns}>
        <section aria-labelledby="will-do">
          <h2 id="will-do">{cs.placeholder.willDoHeading}</h2>
          <ul className={styles.list}>
            {texts.willDo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="proof" className={styles.proof}>
          <h2 id="proof">{cs.placeholder.proofHeading}</h2>
          <p>{texts.proof}</p>
        </section>
      </div>

      {children}

      <nav aria-label={cs.placeholder.storyNav} className={styles.storyNav}>
        {prev ? (
          <Link to={prev.path} rel="prev">
            ← {cs.placeholder.prev}: {cs.modules[prev.id].title}
          </Link>
        ) : (
          <Link to="/">← {cs.placeholder.backHome}</Link>
        )}
        {next ? (
          <Link to={next.path} rel="next">
            {cs.placeholder.next}: {cs.modules[next.id].title} →
          </Link>
        ) : (
          <Link to="/">{cs.placeholder.backHome} →</Link>
        )}
      </nav>
    </article>
  );
}
