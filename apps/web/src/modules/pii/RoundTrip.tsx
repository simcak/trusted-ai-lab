import { Link } from 'react-router';
import { InfoTip } from '../../components/InfoTip/InfoTip.tsx';
import { cs } from '../../i18n/cs.ts';
import type { Flow } from './flow.ts';
import { replySegments } from './segments.ts';
import { SegmentText } from './SegmentText.tsx';
import styles from './pii.module.css';

/** Panel 3: the (simulated) reply comes back with placeholders and is restored in the browser. */
export function RoundTrip({ flow }: { flow: Flow }) {
  const t = cs.pii.reversible;
  if (flow.entries.length === 0) {
    return <p className={styles.muted}>{cs.pii.machine.noReply}</p>;
  }
  return (
    <>
      <div className={styles.simulated}>
        <span className={styles.simulatedText} data-testid="simulated-badge">
          {t.simulatedBadge}
        </span>
        <InfoTip label={t.simulatedTip} title={t.simulatedTip}>
          <p>
            {t.simulatedNote}{' '}
            <Link to={{ pathname: '/agent', search: '?scenario=s4-rodne-cislo' }}>
              {t.simulatedNoteLink}
            </Link>
            .
          </p>
          <p>{t.limitation}</p>
        </InfoTip>
      </div>
      <SegmentText
        segments={replySegments(flow.reply, flow.entries)}
        variant="restored"
        testId="pii-flow-restored"
      />
      <p className={styles.small}>{cs.pii.machine.restoredCaption}</p>
      {flow.unknown.length > 0 && <p role="alert">{t.unknown(flow.unknown.join(', '))}</p>}
    </>
  );
}
