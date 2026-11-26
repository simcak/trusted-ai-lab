import type { CSSProperties } from 'react';
import { TYPE_CATEGORY } from './labels.ts';
import type { Segment } from './segments.ts';
import styles from './pii.module.css';

/**
 * Text with coloured tokens. `redact` shows black bars, `pseudonym` coloured placeholders,
 * `restored` the original value back in place with its placeholder as a small tag.
 */
export function SegmentText({
  segments,
  variant,
  testId,
}: {
  segments: readonly Segment[];
  variant: 'redact' | 'pseudonym' | 'restored';
  testId: string;
}) {
  let index = 0;
  return (
    <div className={styles.textBox} data-testid={testId}>
      {segments.map((s, i) => {
        if (s.kind === 'text') return s.text;
        const style = { '--i': index++ } as CSSProperties;
        const category = TYPE_CATEGORY[s.type];
        if (variant !== 'restored') {
          return (
            <span
              key={i}
              className={styles.token}
              data-variant={variant}
              data-category={category}
              style={style}
            >
              {s.text}
            </span>
          );
        }
        return (
          <span key={i} className={styles.restored} data-category={category} style={style}>
            <span className={styles.original}>{s.original}</span>
            <span className={styles.placeholder}>{s.text}</span>
          </span>
        );
      })}
    </div>
  );
}
