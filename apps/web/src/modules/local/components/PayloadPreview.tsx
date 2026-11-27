import type { CSSProperties } from 'react';
import { cs } from '../../../i18n/cs.ts';
import type { CoachInput } from '../activity/summary.ts';
import { buildCoachRequest } from '../coach/prompt.ts';
import { formatBytes, formatInt } from '../format.ts';
import styles from '../local.module.css';

interface Props {
  points: number;
  fileBytes: number;
  input: CoachInput;
}

/** Step 3: your file against the few lines the model gets, and the exact message on demand. */
export function PayloadPreview({ points, fileBytes, input }: Props) {
  const t = cs.local.payload;
  const message = buildCoachRequest(input).messages[0];
  const text = message?.role === 'user' ? message.content : '';
  const payloadBytes = new TextEncoder().encode(text).byteLength;
  // The model's share drawn to scale, but never thinner than a sliver.
  const share = Math.max(2, Math.min(100, (100 * payloadBytes) / Math.max(1, fileBytes)));
  return (
    <div className={styles.payload}>
      <div className={styles.sizes}>
        <div className={styles.size}>
          <span className={styles.sizeLabel}>{t.file}</span>
          <strong className={styles.sizeValue}>{formatBytes(fileBytes)}</strong>
          <span className={styles.sizeBar} aria-hidden="true">
            <span style={{ width: '100%' }} />
          </span>
          <span className={styles.small}>{t.fileDetail(formatInt(points))}</span>
        </div>
        <div className={styles.size} data-model>
          <span className={styles.sizeLabel}>{t.model}</span>
          <strong className={styles.sizeValue} data-testid="payload-size">
            {formatBytes(payloadBytes)}
          </strong>
          <span className={styles.sizeBar} aria-hidden="true">
            <span style={{ '--share': `${share}%` } as CSSProperties} />
          </span>
          <span className={styles.small}>{t.modelDetail}</span>
        </div>
      </div>
      <details className={styles.message}>
        <summary>{cs.local.machine.showMessage}</summary>
        <pre className={styles.json} data-testid="coach-input">
          {text}
        </pre>
      </details>
    </div>
  );
}
