import type { Finding } from '@trusted-ai-lab/pii-cz';
import type { ReactNode } from 'react';
import { cs } from '../../i18n/cs.ts';
import { reasonsText, TYPE_CATEGORY } from './labels.ts';
import styles from './pii.module.css';

/** The input text with every finding marked and labelled by its type. */
export function HighlightedText({
  text,
  findings,
}: {
  text: string;
  findings: readonly Finding[];
}) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const f of findings) {
    if (f.start > cursor) parts.push(text.slice(cursor, f.start));
    parts.push(
      <mark
        key={`${f.start}-${f.end}`}
        className={styles.mark}
        data-category={TYPE_CATEGORY[f.type]}
        title={`${cs.pii.types[f.type]}: ${reasonsText(f)}`}
      >
        {f.text}
        <span className={styles.markLabel}>{cs.pii.types[f.type]}</span>
      </mark>,
    );
    cursor = f.end;
  }
  parts.push(text.slice(cursor));
  return (
    <div className={styles.textBox} data-testid="pii-highlighted">
      {parts}
    </div>
  );
}
