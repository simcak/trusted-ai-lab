import type { ReactNode } from 'react';
import { cs } from '../../i18n/cs.ts';
import { getModule, type ModuleId } from '../../modules/registry.ts';
import { ModuleHeader } from '../ModuleHeader/ModuleHeader.tsx';
import { StoryNav } from '../StoryNav/StoryNav.tsx';
import styles from './ModulePlaceholder.module.css';

interface Props {
  id: ModuleId;
  /** Optional extra content, e.g. a component preview. */
  children?: ReactNode;
}

export function ModulePlaceholder({ id, children }: Props) {
  const meta = getModule(id);
  const texts = cs.modules[id];

  return (
    <article className={styles.page}>
      <ModuleHeader id={id}>
        <p className={styles.notice}>
          <span className={styles.status}>{cs.status.planned(meta.phase)}</span>
          {cs.placeholder.notice}
        </p>
      </ModuleHeader>

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

      <StoryNav id={id} />
    </article>
  );
}
