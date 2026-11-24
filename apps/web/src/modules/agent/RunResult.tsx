import { cs } from '../../i18n/cs.ts';
import styles from './agent.module.css';
import type { RunState } from './useAgentRun.ts';

/** The conversation as the user sees it: question, answer (re-identified locally) and drafts. */
export function RunResult({ state }: { state: RunState }) {
  const t = cs.agent.result;
  if (state.status === 'idle') return <p className={styles.muted}>{t.empty}</p>;

  return (
    <div className={styles.chat} data-testid="agent-result" aria-live="polite">
      <p className={styles.kind}>{state.kind === 'live' ? t.liveLabel : t.replayLabel}</p>
      {state.userMessage && (
        <div className={styles.message} data-role="user">
          <span className={styles.speaker}>{t.user}</span>
          <p>{state.userMessage}</p>
        </div>
      )}

      {state.status === 'running' && <p className={styles.muted}>{cs.agent.run.running}</p>}

      {state.status === 'error' && state.error && (
        <p role="alert" className={styles.error} data-testid="agent-error">
          {t.errors[state.error]}
        </p>
      )}

      {state.result && (
        <>
          <div className={styles.message} data-role="assistant" data-testid="agent-answer">
            <span className={styles.speaker}>{t.assistant}</span>
            <p>{state.result.answer}</p>
          </div>
          <p className={styles.status} data-status={state.result.status} data-testid="agent-status">
            {t.status[state.result.status]}
          </p>
          {state.result.drafts.map((draft) => (
            <article key={draft.id} className={styles.draft} data-testid="agent-draft">
              <h3>
                {t.draftHeading} <span className={styles.notSent}>{t.draftNotSent}</span>
              </h3>
              <dl className={styles.draftMeta}>
                <div>
                  <dt>{t.draftTo}</dt>
                  <dd>{t.roles[draft.toRole]}</dd>
                </div>
                <div>
                  <dt>{t.draftSubject}</dt>
                  <dd>{draft.subject}</dd>
                </div>
              </dl>
              <pre className={styles.draftBody}>{draft.body}</pre>
            </article>
          ))}
        </>
      )}
    </div>
  );
}
