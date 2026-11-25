import { cs } from '../../../i18n/cs.ts';
import type { CoachInput } from '../activity/summary.ts';
import { buildCoachRequest, COACH_SYSTEM_PROMPT } from '../coach/prompt.ts';
import { formatBytes, formatInt } from '../format.ts';
import styles from '../local.module.css';

interface Props {
  points: number;
  fileBytes: number;
  input: CoachInput;
}

export function PayloadPreview({ points, fileBytes, input }: Props) {
  const t = cs.local.payload;
  const message = buildCoachRequest(input).messages[0];
  const text = message?.role === 'user' ? message.content : '';
  const payloadBytes = new TextEncoder().encode(text).byteLength;
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
          <span className={styles.small}>{t.modelDetail}</span>
        </div>
      </div>
      <details className={styles.details} open>
        <summary>{t.jsonLabel}</summary>
        <pre className={styles.json} data-testid="coach-input">
          {text}
        </pre>
      </details>
      <details className={styles.details}>
        <summary>{t.promptLabel}</summary>
        <pre className={styles.json}>{COACH_SYSTEM_PROMPT}</pre>
      </details>
    </section>
  );
}
