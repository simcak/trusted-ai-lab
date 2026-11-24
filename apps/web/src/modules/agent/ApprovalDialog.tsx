import { useEffect, useRef } from 'react';
import { cs } from '../../i18n/cs.ts';
import styles from './agent.module.css';
import type { PendingApproval } from './useAgentRun.ts';

/**
 * Human in the loop. In replay it shows the decision made while recording and continues on click;
 * in a live (BYOK) run the visitor decides.
 */
export function ApprovalDialog({ pending }: { pending: PendingApproval }) {
  const t = cs.agent.approval;
  const ref = useRef<HTMLDialogElement>(null);
  const { request, recorded, resolve } = pending;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    // jsdom has no showModal(); the `open` attribute keeps the dialog usable there.
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }, []);

  const decide = (decision: 'approved' | 'rejected') => {
    ref.current?.close?.();
    resolve({ decision, decidedBy: 'user' });
  };
  const continueRecorded = () => {
    ref.current?.close?.();
    if (recorded) resolve(recorded);
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="approval-heading"
      data-testid="approval-dialog"
      onCancel={(e) => {
        // Escape: in replay continue with the recorded decision, live it means „reject“.
        e.preventDefault();
        if (recorded) continueRecorded();
        else decide('rejected');
      }}
    >
      <h2 id="approval-heading">{t.heading}</h2>
      <p>{t.intro}</p>
      <dl className={styles.draftMeta}>
        <div>
          <dt>{cs.agent.result.draftTo}</dt>
          <dd>{cs.agent.result.roles[request.draft.toRole]}</dd>
        </div>
        <div>
          <dt>{cs.agent.result.draftSubject}</dt>
          <dd>{request.draft.subject}</dd>
        </div>
      </dl>
      <pre className={styles.draftBody}>{request.draft.body}</pre>

      {recorded ? (
        <>
          <p className={styles.recordedDecision} data-decision={recorded.decision}>
            {t.recordedDecision}: <strong>{t.decisions[recorded.decision]}</strong> (
            {t.decidedBy[recorded.decidedBy]})
          </p>
          <div className={styles.actions}>
            <button type="button" className="button" onClick={continueRecorded} autoFocus>
              {t.continue}
            </button>
          </div>
        </>
      ) : (
        <div className={styles.actions}>
          <button type="button" className="button" onClick={() => decide('approved')}>
            {t.approve}
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => decide('rejected')}
            autoFocus
          >
            {t.reject}
          </button>
        </div>
      )}
    </dialog>
  );
}
