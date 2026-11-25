import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { cs } from '../../i18n/cs.ts';
import { getModule, type ModuleId } from '../../modules/registry.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { InfoDrawer } from '../InfoDrawer/InfoDrawer.tsx';
import { TermList } from '../TermList/TermList.tsx';
import styles from './ProjectShell.module.css';

interface Props {
  id: ModuleId;
  /** Extra drawer sections (measurements, limits, under the hood…), each a `<section>`. */
  info?: ReactNode;
  children: ReactNode;
}

/**
 * Title bar of a project's display: back to the gallery, title and question, short status
 * chips, the terms and a "how it works" drawer. Everything else lives in the display below.
 */
export function ProjectShell({ id, info, children }: Props) {
  const meta = getModule(id);
  const t = cs.modules[id];
  useDocumentTitle(t.title);

  return (
    <article className={styles.project} data-accent={meta.accent}>
      <header className={styles.bar}>
        <Link to="/" className={styles.back} aria-label={cs.shell.backToGalleryLabel}>
          <span aria-hidden="true">←</span> {cs.shell.backToGallery}
        </Link>
        <div className={styles.title}>
          <span className={styles.badge}>
            <Sprite sprite={meta.thumb} scale={2} />
          </span>
          <div>
            <h1>{t.title}</h1>
            <p className={styles.question}>{t.question}</p>
          </div>
        </div>
        <ul className={styles.chips}>
          {t.chips.map((chip) => (
            <li key={chip} className="px-chip">
              {chip}
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          <TermList terms={cs.glossary.byModule[id]} />
          <InfoDrawer label={cs.shell.howItWorks} title={t.title}>
            <section>
              <h3>{cs.shell.whatItDoes}</h3>
              <p>{t.summary}</p>
              <p>{t.notice}</p>
            </section>
            {info}
            <section>
              <h3>{cs.shell.proof}</h3>
              <p>{t.proof}</p>
            </section>
          </InfoDrawer>
        </div>
      </header>
      {children}
    </article>
  );
}
