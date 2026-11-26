import type { Persona } from '@trusted-ai-lab/agent-runtime';
import type { ReactNode } from 'react';
import machine from '../../components/Machine/machine.module.css';
import { cs } from '../../i18n/cs.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { advisor, person, robot } from '../../pixel/sprites/actors.ts';
import styles from './agent.module.css';
import type { RunState } from './useAgentRun.ts';

interface Props {
  state: RunState;
  /** The question of the chosen scenario, shown before anything runs. */
  question: string;
  persona: Persona;
  /** Where the answers come from (replay) — always visible next to the conversation. */
  provenance: ReactNode;
}

/** The conversation as the user sees it: question, answer (re-identified locally) and drafts. */
export function RunChat({ state, question, persona, provenance }: Props) {
  const t = cs.agent.result;
  const live = state.kind === 'live';
  return (
    <div className={styles.chat} data-testid="agent-result" aria-live="polite">
      <div className={styles.chatHead}>
        {live ? (
          <p className={styles.provenance} data-kind="live">
            {t.liveLabel}
          </p>
        ) : (
          provenance
        )}
      </div>

      <div className={styles.message} data-role="user">
        <span className={styles.avatar} aria-hidden="true">
          <Sprite sprite={persona === 'poradce' ? advisor : person} scale={2} />
        </span>
        <div className={styles.bubble}>
          <span className={styles.speaker}>{cs.agent.run.personaLabel[persona]}</span>
          <p>{state.userMessage ?? question}</p>
        </div>
      </div>

      {state.status === 'running' && (
        <p className={styles.typing} role="status">
          <span aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {cs.agent.run.running}
        </p>
      )}

      {state.status === 'error' && state.error && (
        <p role="alert" className={styles.error} data-testid="agent-error">
          {t.errors[state.error]}
        </p>
      )}

      {state.result && (
        <>
          <div
            className={`${styles.message} ${machine.popIn}`}
            data-role="assistant"
            data-testid="agent-answer"
          >
            <span className={styles.avatar} aria-hidden="true">
              <Sprite sprite={robot} scale={2} />
            </span>
            <div className={styles.bubble}>
              <span className={styles.speaker}>{t.assistant}</span>
              <p>{state.result.answer}</p>
            </div>
          </div>
          {state.result.drafts.map((draft) => (
            <article
              key={draft.id}
              className={`${styles.draft} ${machine.popIn}`}
              data-testid="agent-draft"
            >
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
          <p className={styles.status} data-status={state.result.status} data-testid="agent-status">
            {t.status[state.result.status]}
          </p>
        </>
      )}
    </div>
  );
}
