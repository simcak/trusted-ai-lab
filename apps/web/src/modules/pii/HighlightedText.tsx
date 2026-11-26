import type { Finding } from '@trusted-ai-lab/pii-cz';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { InfoTip } from '../../components/InfoTip/InfoTip.tsx';
import { cs } from '../../i18n/cs.ts';
import { formatScore } from './format.ts';
import { reasonsText, TYPE_CATEGORY } from './labels.ts';
import styles from './pii.module.css';

/**
 * The input with every finding marked in its category colour. The type label is a button that
 * opens why the library flagged it; a click anywhere on the mark opens the same panel.
 */
export function HighlightedText({
  text,
  findings,
}: {
  text: string;
  findings: readonly Finding[];
}) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  findings.forEach((f, i) => {
    if (f.start > cursor) parts.push(text.slice(cursor, f.start));
    parts.push(<FindingMark key={`${f.start}-${f.end}`} finding={f} index={i} />);
    cursor = f.end;
  });
  parts.push(text.slice(cursor));
  return (
    <div className={styles.textBox} data-testid="pii-highlighted">
      {parts}
    </div>
  );
}

function FindingMark({ finding: f, index }: { finding: Finding; index: number }) {
  const t = cs.pii.machine;
  const type = cs.pii.types[f.type];
  const openWhy = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button, [popover]')) return;
    event.currentTarget.querySelector('button')?.click();
  };
  return (
    // The mark only forwards pointer clicks to its label button, which is the keyboard control.
    <mark
      className={styles.mark}
      data-category={TYPE_CATEGORY[f.type]}
      style={{ '--i': index } as CSSProperties}
      onClick={openWhy}
    >
      {f.text}
      <InfoTip bare className={styles.markLabel} text={type} label={t.why(type)} title={type}>
        <dl className={styles.why}>
          <div>
            <dt>{t.reasons}</dt>
            <dd>{reasonsText(f)}</dd>
          </div>
          <div>
            <dt>{t.score}</dt>
            <dd>{formatScore(f.score)}</dd>
          </div>
          <div>
            <dt>{t.detector}</dt>
            <dd>{cs.pii.findings.detectors[f.detector] ?? f.detector}</dd>
          </div>
        </dl>
      </InfoTip>
    </mark>
  );
}
