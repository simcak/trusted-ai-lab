import { useState } from 'react';
import { cs } from '../../../i18n/cs.ts';
import type { CoachInput } from '../activity/summary.ts';
import { MAX_QUESTION_LENGTH } from '../coach/prompt.ts';
import { COACH_MODELS, downloadBytes, WEBLLM_VERSION, type CoachModelKey } from '../coach/model.ts';
import type { useCoach } from '../coach/useCoach.ts';
import { formatBytes, formatDecimal } from '../format.ts';
import styles from '../local.module.css';

interface Props {
  coach: ReturnType<typeof useCoach>;
  input: CoachInput | undefined;
  template: string[];
}

export function CoachPanel({ coach, input, template }: Props) {
  const t = cs.local.coach;
  const [question, setQuestion] = useState('');
  const { gpu, load, answer } = coach;
  const ready = load.status === 'ready' && load.key === coach.modelKey;
  const busy = answer.status === 'writing';
  const canRun = ready && input !== undefined && !busy;

  const ask = (q: string) => {
    if (!input || !q.trim()) return;
    void coach.ask(input, q.trim().slice(0, MAX_QUESTION_LENGTH));
  };

  return (
    <section className={styles.section} aria-labelledby="coach-heading">
      <h2 id="coach-heading">{t.heading}</h2>
      <p>{t.intro}</p>

      {gpu === null && <p role="status">{t.checking}</p>}

      {gpu?.status === 'unsupported' && (
        <div className={styles.warning} role="status" data-testid="webgpu-unsupported">
          <p>{t.unsupported[gpu.reason]}</p>
          <p>{t.unsupportedHint}</p>
        </div>
      )}

      {gpu?.status === 'ok' && (
        <div className={styles.coachControls}>
          <p className={styles.small}>{gpu.label ? t.gpu(gpu.label) : t.gpuUnknown}</p>
          <fieldset className={styles.modelChoice} disabled={load.status === 'loading'}>
            <legend className={styles.groupLabel}>{t.modelLegend}</legend>
            {(Object.keys(COACH_MODELS) as CoachModelKey[]).map((key) => {
              const variant = COACH_MODELS[key].variants.f16;
              return (
                <label key={key} className={styles.modelOption}>
                  <input
                    type="radio"
                    name="coach-model"
                    checked={coach.modelKey === key}
                    onChange={() => coach.setModelKey(key)}
                  />
                  <span>
                    <strong>
                      {t.models[key].label} · {COACH_MODELS[key].name}
                    </strong>{' '}
                    <span className={styles.small}>
                      {t.models[key].detail} · {formatBytes(downloadBytes(variant))}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          {!ready && load.status !== 'loading' && (
            <>
              <button type="button" className="button" onClick={() => void coach.loadModel()}>
                {coach.cached[coach.modelKey]
                  ? t.start
                  : t.download(formatBytes(downloadBytes(coach.variant)))}
              </button>
              {!coach.cached[coach.modelKey] && <p className={styles.small}>{t.downloadNote}</p>}
            </>
          )}

          {load.status === 'loading' && (
            <div role="status" aria-live="polite">
              <p>{t.loading}</p>
              <progress max={1} value={load.fraction} />
              <span className={styles.small}>{t.progress(Math.round(load.fraction * 100))}</span>
            </div>
          )}

          {load.status === 'error' && (
            <p role="alert" className={styles.error}>
              {t.errors[load.kind]}
            </p>
          )}

          {ready && (
            <>
              <p role="status">{t.ready(COACH_MODELS[coach.modelKey].name)}</p>
              {!input && <p className={styles.small}>{t.selectFirst}</p>}
              <div className={styles.buttons}>
                <button
                  type="button"
                  className="button"
                  disabled={!canRun}
                  onClick={() => input && void coach.explain(input)}
                >
                  {t.explain}
                </button>
                {busy && (
                  <button type="button" className="button button--secondary" onClick={coach.stop}>
                    {t.stop}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {(answer.status === 'writing' || answer.status === 'done') && (
        <div className={styles.answer} aria-live="polite" data-testid="coach-answer">
          <span className={styles.groupLabel}>{t.answerLabel}</span>
          {answer.question && <p className={styles.small}>{t.questionLabel(answer.question)}</p>}
          {answer.redactions > 0 && <p className={styles.small}>{t.redacted(answer.redactions)}</p>}
          <p className={styles.answerText}>{answer.text || t.writing}</p>
          {answer.status === 'done' && answer.stats?.decodeTokensPerSecond !== undefined && (
            <p className={styles.small}>
              {t.speed(formatDecimal(answer.stats.decodeTokensPerSecond))}
            </p>
          )}
          <p className={styles.small}>{t.caution}</p>
        </div>
      )}
      {answer.status === 'error' && (
        <p role="alert" className={styles.error}>
          {t.errors.generation}
        </p>
      )}

      {ready && (
        <form
          className={styles.askForm}
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <h3>{t.askHeading}</h3>
          <div className={styles.suggestions}>
            {t.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="button button--secondary"
                disabled={!canRun}
                onClick={() => ask(s)}
              >
                {s}
              </button>
            ))}
          </div>
          <label className={styles.field}>
            {t.askLabel}
            <span className={styles.askRow}>
              <input
                type="text"
                value={question}
                maxLength={MAX_QUESTION_LENGTH}
                placeholder={t.askPlaceholder}
                onChange={(e) => setQuestion(e.currentTarget.value)}
              />
              <button type="submit" className="button" disabled={!canRun || !question.trim()}>
                {t.ask}
              </button>
            </span>
          </label>
          <p className={styles.small}>{t.askHint}</p>
        </form>
      )}

      {template.length > 0 && (
        <div className={styles.template} data-testid="coach-template">
          <span className={styles.groupLabel}>{t.templateLabel}</span>
          <p>{template.join(' ')}</p>
        </div>
      )}

      {gpu?.status === 'ok' && coach.cached[coach.modelKey] && load.status !== 'loading' && (
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => void coach.deleteModel()}
        >
          {t.delete}
        </button>
      )}
      <p className={styles.small}>{t.credits(WEBLLM_VERSION)}</p>
    </section>
  );
}
