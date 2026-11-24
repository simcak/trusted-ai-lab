import { cs } from '../../../i18n/cs.ts';
import type { CoachInput } from '../activity/summary.ts';
import { COACH_SYSTEM_PROMPT } from '../coach/prompt.ts';
import { formatBytes, formatInt } from '../format.ts';
import styles from '../local.module.css';

interface Props {
  points: number;
  fileBytes: number;
  input: CoachInput;
}

/** Number of leaf values (numbers, texts, flags) in the model input. */
function countValues(value: unknown): number {
  if (value === null || typeof value !== 'object') return 1;
  return Object.values(value).reduce<number>((sum, v) => sum + countValues(v), 0);
}

export function PayloadPreview({ points, fileBytes, input }: Props) {
  const t = cs.local.payload;
  const json = JSON.stringify(input, null, 2);
  const payloadBytes = new TextEncoder().encode(JSON.stringify(input)).byteLength;
  return (
    <section className={styles.section} aria-labelledby="payload-heading">
      <h2 id="payload-heading">{t.heading}</h2>
      <p>{t.intro}</p>
      <div className={styles.compare}>
        <div className={styles.compareCard}>
          <span className={styles.groupLabel}>{t.file}</span>
          <strong className={styles.compareValue}>{formatBytes(fileBytes)}</strong>
          <span className={styles.small}>{t.fileDetail(formatInt(points))}</span>
        </div>
        <span className={styles.compareArrow} aria-hidden="true">
          →
        </span>
        <div className={`${styles.compareCard} ${styles.compareCardModel}`}>
          <span className={styles.groupLabel}>{t.model}</span>
          <strong className={styles.compareValue} data-testid="payload-size">
            {formatBytes(payloadBytes)}
          </strong>
          <span className={styles.small}>{t.modelDetail(countValues(input))}</span>
        </div>
      </div>
      <details className={styles.details} open>
        <summary>{t.jsonLabel}</summary>
        <pre className={styles.json} data-testid="coach-input">
          {json}
        </pre>
      </details>
      <details className={styles.details}>
        <summary>{t.promptLabel}</summary>
        <pre className={styles.json}>{COACH_SYSTEM_PROMPT}</pre>
      </details>
    </section>
  );
}
