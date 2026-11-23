import { cs } from '../../i18n/cs.ts';
import styles from './Disclaimer.module.css';

/** Always-visible disclaimer (CLAUDE.md rule 7). */
export function Disclaimer() {
  return (
    <section className={styles.disclaimer} aria-labelledby="disclaimer-heading">
      <h2 id="disclaimer-heading" className={styles.heading}>
        {cs.disclaimer.heading}
      </h2>
      <ul className={styles.list}>
        {cs.disclaimer.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
