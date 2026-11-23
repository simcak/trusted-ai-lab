import type { ReactNode } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts';
import { cs } from '../../i18n/cs.ts';
import { MODULES, getModule, type ModuleId } from '../../modules/registry.ts';
import styles from './ModuleHeader.module.css';

interface Props {
  id: ModuleId;
  /** Extra content under the summary, e.g. a "planned" notice. */
  children?: ReactNode;
}

/** Page header shared by all module pages: position in the story, title, question, summary. */
export function ModuleHeader({ id, children }: Props) {
  const meta = getModule(id);
  const texts = cs.modules[id];
  useDocumentTitle(texts.title);

  return (
    <header className={styles.header}>
      <p className={styles.eyebrow}>{cs.placeholder.moduleOf(meta.number, MODULES.length)}</p>
      <h1>{texts.title}</h1>
      <p className={styles.question}>{texts.question}</p>
      <p className={styles.summary}>{texts.summary}</p>
      {children}
    </header>
  );
}
