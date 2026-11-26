import {
  RULE_IDS,
  SCENARIOS,
  SCENARIO_IDS,
  replayRecording,
  type ScenarioId,
} from '@trusted-ai-lab/agent-runtime';
import { useSearchParams } from 'react-router';
import { ProjectShell } from '../../components/ProjectShell/ProjectShell.tsx';
import { TracePanel } from '../../components/TracePanel/TracePanel.tsx';
import { cs } from '../../i18n/cs.ts';
import { ApprovalDialog } from './ApprovalDialog.tsx';
import { ByokPanel } from './ByokPanel.tsx';
import { FUNDS } from './funds.ts';
import { getRecording } from './recordings.ts';
import { RunResult } from './RunResult.tsx';
import { useAgentRun } from './useAgentRun.ts';
import styles from './agent.module.css';

const dateFormat = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'long', timeZone: 'UTC' });
const isScenarioId = (value: string | null): value is ScenarioId =>
  value !== null && (SCENARIO_IDS as readonly string[]).includes(value);

/** Delay per replayed model call, so the timeline visibly builds up step by step. */
const REPLAY_DELAY_MS = 350;

export default function AgentPage() {
  const t = cs.agent;
  const [params, setParams] = useSearchParams();
  const requested = params.get('scenario');
  const scenarioId: ScenarioId = isScenarioId(requested) ? requested : 's1-bezny-dotaz';
  const guardrails = params.get('guardrails') !== 'off';
  const scenario = SCENARIOS[scenarioId];
  const recording = getRecording(scenarioId, guardrails);
  const { events, state, pending, start, reset } = useAgentRun();
  const running = state.status === 'running';

  const select = (next: { scenario?: ScenarioId; guardrails?: boolean }) => {
    reset();
    const id = next.scenario ?? scenarioId;
    const on = next.guardrails ?? guardrails;
    setParams({ scenario: id, ...(on ? {} : { guardrails: 'off' }) }, { replace: true });
  };

  const runReplay = () => {
    if (!recording) return;
    void start('replay', scenario.userMessage, ({ log, signal, approve }) =>
      replayRecording(recording, {
        funds: FUNDS,
        log,
        signal,
        delayMs: REPLAY_DELAY_MS,
        onApproval: async (request, recorded) => {
          await approve(request, recorded);
        },
      }),
    );
  };

  const servedModels = recording ? [...new Set(recording.steps.map((s) => s.response.model))] : [];

  return (
    <ProjectShell id="agent">
      <div className={styles.page}>
        <section className={styles.section} aria-labelledby="agent-run-heading">
          <h2 id="agent-run-heading">{t.run.heading}</h2>
          <p>{t.run.intro}</p>

          <div className={styles.runner}>
            <fieldset className={styles.scenarios}>
              <legend className={styles.groupLabel}>{t.run.scenarioLegend}</legend>
              {SCENARIO_IDS.map((id) => (
                <label key={id} className={styles.scenario}>
                  <input
                    type="radio"
                    name="agent-scenario"
                    value={id}
                    checked={scenarioId === id}
                    onChange={() => select({ scenario: id })}
                  />
                  <span>
                    <strong>{t.scenarios[id].title}</strong>
                    <span className={styles.small}>{t.scenarios[id].watch}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div className={styles.controls}>
              <fieldset className={styles.inlineRadios}>
                <legend className={styles.groupLabel}>{t.run.guardrailsLegend}</legend>
                {[true, false].map((on) => (
                  <label key={String(on)}>
                    <input
                      type="radio"
                      name="agent-guardrails"
                      checked={guardrails === on}
                      onChange={() => select({ guardrails: on })}
                    />
                    {on ? t.run.guardrailsOn : t.run.guardrailsOff}
                  </label>
                ))}
              </fieldset>

              <p className={styles.persona}>
                {t.run.persona}: <strong>{t.run.personas[scenario.persona]}</strong>
              </p>

              <figure className={styles.quote}>
                <figcaption className={styles.groupLabel}>{t.run.userMessage}</figcaption>
                <blockquote>{scenario.userMessage}</blockquote>
              </figure>

              {recording ? (
                <div className={styles.provenance} aria-label={t.provenance.label}>
                  {recording.steps.length === 0 ? (
                    <p data-testid="agent-provenance">{t.provenance.noModel}</p>
                  ) : (
                    <>
                      <p
                        className={styles.recordedBadge}
                        data-kind={recording.kind}
                        data-testid="agent-provenance"
                      >
                        {recording.kind === 'recorded'
                          ? t.provenance.recorded
                          : t.provenance.fixture}
                      </p>
                      <dl>
                        <div>
                          <dt>{t.provenance.model}</dt>
                          <dd>
                            <code>{servedModels.join(', ')}</code>
                          </dd>
                        </div>
                        <div>
                          <dt>{t.provenance.provider}</dt>
                          <dd>{t.provenance.providers[recording.run.provider]}</dd>
                        </div>
                        <div>
                          <dt>{t.provenance.recordedAt}</dt>
                          <dd>{dateFormat.format(new Date(recording.recordedAt))}</dd>
                        </div>
                        <div>
                          <dt>{t.provenance.promptVersion}</dt>
                          <dd>
                            <code>{recording.promptVersion}</code>
                          </dd>
                        </div>
                      </dl>
                      {recording.run.provider === 'claude-code' && (
                        <p className={styles.small}>{t.provenance.claudeCodeNote}</p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p className={styles.muted} data-testid="agent-not-recorded">
                  {t.run.notRecorded}
                </p>
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className="button"
                  onClick={runReplay}
                  disabled={!recording || running}
                >
                  {running ? t.run.running : t.run.start}
                </button>
              </div>
            </div>
          </div>

          <ByokPanel running={running} start={start} />

          <div className={styles.output}>
            <h3>{t.result.heading}</h3>
            <RunResult state={state} />
            <TracePanel events={events} title={t.result.traceTitle} headingLevel={3} />
          </div>
        </section>

        <section className={styles.section} aria-labelledby="agent-rules-heading">
          <h2 id="agent-rules-heading">{t.rules.heading}</h2>
          <p>{t.rules.intro}</p>
          <dl className={styles.rules}>
            {RULE_IDS.map((id) => (
              <div key={id}>
                <dt>
                  <code>{id}</code>
                </dt>
                <dd>{t.rules.items[id]}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.section} aria-labelledby="agent-limits-heading">
          <h2 id="agent-limits-heading">{t.limits.heading}</h2>
          <ul className={styles.list}>
            {t.limits.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {pending && <ApprovalDialog key={pending.request.toolCallId} pending={pending} />}
      </div>
    </ProjectShell>
  );
}
