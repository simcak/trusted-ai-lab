import type { ReactNode } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { cs } from '../../i18n/cs.ts';
import { getModule, type ModuleId } from '../../modules/registry.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { InfoDrawer } from '../InfoDrawer/InfoDrawer.tsx';
import { InfoTicker } from '../InfoTicker/InfoTicker.tsx';
import { TermList } from '../TermList/TermList.tsx';
import styles from './ProjectShell.module.css';

interface Props {
  id: ModuleId;
  /** Extra "under the hood" sections (measurements, limits, sources…), each a `<section>`. */
  info?: ReactNode;
  children: ReactNode;
}

/**
 * A project's frame: title and question, terms, an "under the hood" drawer for everything
 * that does not have to be seen, and a strip of rotating tips. The tool comes right after.
 * The page takes the project's colour (buttons, links, focus) from `data-accent`.
 */
export function ProjectShell({ id, info, children }: Props) {
  const meta = getModule(id);
  const t = cs.modules[id];
  useDocumentTitle(t.title);

  return (
    <article className={styles.project} data-accent={meta.accent}>
      <header className={styles.bar} data-sprite-host>
        <div className={styles.title}>
          <span className={styles.badge}>
            <Sprite sprite={meta.thumb} scale={2} fps={3} play="hover" />
          </span>
          <div>
            <h1>{t.title}</h1>
            <p className={styles.question}>{t.question}</p>
          </div>
        </div>
        <div className={styles.actions}>
          <TermList terms={cs.glossary.byModule[id]} />
          <InfoDrawer label={cs.shell.underTheHood} title={`${cs.shell.underTheHood}: ${t.title}`}>
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
      <InfoTicker tips={t.tips} />
      {children}
    </article>
  );
}
