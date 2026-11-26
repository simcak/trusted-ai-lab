import { cs, type TermId } from '../../i18n/cs.ts';
import { InfoTip } from '../InfoTip/InfoTip.tsx';
import styles from './TermList.module.css';

/**
 * "Terms used here" behind one button: a popover with each term and a one-line explanation,
 * so the display itself stays free of jargon for people new to AI.
 */
export function TermList({ terms }: { terms: readonly TermId[] }) {
  if (terms.length === 0) return null;
  return (
    <InfoTip label={cs.glossary.label} text={cs.glossary.label} title={cs.glossary.label}>
      <dl className={styles.list}>
        {terms.map((term) => {
          const entry = cs.glossary.terms[term];
          return (
            <div key={term}>
              <dt>{entry.term}</dt>
              <dd>{entry.text}</dd>
            </div>
          );
        })}
      </dl>
    </InfoTip>
  );
}
