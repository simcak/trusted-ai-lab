import { useId } from 'react';
import { cs, type TermId } from '../../i18n/cs.ts';
import styles from './TermList.module.css';

/**
 * "Terms used here" as small buttons; each opens a short explanation in a native popover
 * (light dismiss, Esc, no library). Keeps the module texts short for people new to AI.
 */
export function TermList({ terms }: { terms: readonly TermId[] }) {
  const id = useId();
  if (terms.length === 0) return null;
  return (
    <div className={styles.terms}>
      <span className={styles.label}>{cs.glossary.label}</span>
      <ul className={styles.list}>
        {terms.map((term) => {
          const entry = cs.glossary.terms[term];
          const popoverId = `${id}-${term}`;
          return (
            <li key={term}>
              <button type="button" className={styles.term} popoverTarget={popoverId}>
                {entry.term}
              </button>
              <div id={popoverId} popover="auto" className={styles.popover} role="note">
                <strong>{entry.term}</strong>
                <p>{entry.text}</p>
                <button
                  type="button"
                  className={styles.close}
                  popoverTarget={popoverId}
                  popoverTargetAction="hide"
                >
                  {cs.glossary.close}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
