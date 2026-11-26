import {
  SCENARIOS,
  SCENARIO_IDS,
  replayRecording,
  type ScenarioId,
} from '@trusted-ai-lab/agent-runtime';
import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { InfoTip } from '../../components/InfoTip/InfoTip.tsx';
import machine from '../../components/Machine/machine.module.css';
import { Panel } from '../../components/Machine/Panel.tsx';
import { ProjectShell } from '../../components/ProjectShell/ProjectShell.tsx';
import { cs } from '../../i18n/cs.ts';
import { AgentDetails } from './AgentDetails.tsx';
import { ApprovalDialog } from './ApprovalDialog.tsx';
import { ByokPanel } from './ByokPanel.tsx';
import { FUNDS } from './funds.ts';
import { GuardSwitch } from './GuardSwitch.tsx';
import { Provenance } from './Provenance.tsx';
import { getRecording } from './recordings.ts';
import { RunChat } from './RunChat.tsx';
import { runSetup, toBeats } from './stage/beats.ts';
import { RunLane } from './stage/RunLane.tsx';
import { useAgentRun } from './useAgentRun.ts';
import styles from './agent.module.css';

const isScenarioId = (value: string | null): value is ScenarioId =>
  value !== null && (SCENARIO_IDS as readonly string[]).includes(value);

/** Delay per replayed model call, so the lane visibly builds up step by step. */
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
  const beats = useMemo(() => toBeats(events), [events]);
  const running = state.status === 'running';

  // A scenario reached by a link or the back button starts clean; one picked here runs at once.
  const chosen = useRef(`${scenarioId}/${guardrails}`);
  useEffect(() => {
    const key = `${scenarioId}/${guardrails}`;
    if (chosen.current !== key) reset();
    chosen.current = key;
  }, [scenarioId, guardrails, reset]);

  const runReplay = (id: ScenarioId, on: boolean) => {
    const rec = getRecording(id, on);
    if (!rec) return;
    void start('replay', SCENARIOS[id].userMessage, ({ log, signal, approve }) =>
      replayRecording(rec, {
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

  /** A choice is a request to see it: switch the scenario (or the guardrails) and run it. */
  const select = (next: { scenario?: ScenarioId; guardrails?: boolean }) => {
    reset();
    const id = next.scenario ?? scenarioId;
    const on = next.guardrails ?? guardrails;
    chosen.current = `${id}/${on}`;
    setParams({ scenario: id, ...(on ? {} : { guardrails: 'off' }) }, { replace: true });
    runReplay(id, on);
  };

  const live = state.kind === 'live';
  // The traced run knows its persona and guardrails (a live run sets them in its own form).
  const setup = useMemo(() => runSetup(events), [events]);
  const persona = setup.persona ?? scenario.persona;
  const laneGuardrails = setup.guardrails ?? guardrails;
  const idle = (
    <>
      <button
        type="button"
        className={`button ${styles.bigStart}`}
        onClick={() => runReplay(scenarioId, guardrails)}
        disabled={!recording}
      >
        <span aria-hidden="true">▶ </span>
        {t.run.start}
      </button>
      {!recording && (
        <p className={machine.muted} data-testid="agent-not-recorded">
          {t.run.notRecorded}
        </p>
      )}
    </>
  );

  return (
    <ProjectShell id="agent" info={<AgentDetails events={events} />}>
      <section className={styles.machine} aria-label={cs.modules.agent.title}>
        <div className={styles.deck}>
          <div className={machine.group} role="group" aria-label={t.run.scenarioLegend}>
            <div className={machine.groupLabel}>
              <span aria-hidden="true">{t.run.scenarioLegend}</span>
              <InfoTip label={t.run.watch} title={t.scenarios[scenarioId].title} icon="bulb">
                <p>{t.scenarios[scenarioId].watch}</p>
              </InfoTip>
            </div>
            <div className={machine.choices}>
              {SCENARIO_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={machine.choice}
                  aria-pressed={scenarioId === id && !live}
                  onClick={() => select({ scenario: id })}
                >
                  {t.scenarios[id].title}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.controls}>
            <GuardSwitch on={guardrails} onChange={(on) => select({ guardrails: on })} />
            {state.status !== 'idle' && (
              <button
                type="button"
                className="button button--secondary"
                onClick={() => runReplay(scenarioId, guardrails)}
                disabled={!recording || running}
              >
                <span aria-hidden="true">↻ </span>
                {running ? t.run.running : t.run.again}
              </button>
            )}
          </div>
        </div>

        <div className={styles.stage}>
          <Panel as="section" step={1} tone="sky" title={t.lane.title} className={styles.lanePanel}>
            <RunLane beats={beats} guardrails={laneGuardrails} persona={persona} idle={idle} />
          </Panel>
          <Panel as="section" step={2} tone="berry" title={t.chat.title}>
            <RunChat
              state={state}
              question={scenario.userMessage}
              persona={persona}
              provenance={recording && <Provenance recording={recording} />}
            />
          </Panel>
        </div>

        <ByokPanel running={running} start={start} />
      </section>

      {pending && <ApprovalDialog key={pending.request.toolCallId} pending={pending} />}
    </ProjectShell>
  );
}
