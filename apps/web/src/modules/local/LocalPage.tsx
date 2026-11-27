import { createTraceLog } from '@trusted-ai-lab/llm-core';
import { useMemo, useState, useSyncExternalStore, type DragEvent } from 'react';
import machine from '../../components/Machine/machine.module.css';
import { Panel } from '../../components/Machine/Panel.tsx';
import { ProjectShell } from '../../components/ProjectShell/ProjectShell.tsx';
import { cs } from '../../i18n/cs.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { calculator, chart, watch } from '../../pixel/sprites/actors.ts';
import { envelope } from '../../pixel/sprites/hero.ts';
import { localThumb } from '../../pixel/sprites/projects.ts';
import { acwr, weekLoad, dayKey, type LoadEntry } from './activity/load.ts';
import { DEFAULT_PRIVACY_RADIUS_M, protect } from './activity/privacy.ts';
import { computeMetrics, toCoachInput, type CoachInput } from './activity/summary.ts';
import { trimp } from './activity/heart-rate.ts';
import { templateExplanation } from './coach/template.ts';
import { useCoach } from './coach/useCoach.ts';
import { CoachPanel } from './components/CoachPanel.tsx';
import { HeartRateSettings, ZonesBar } from './components/HeartRatePanel.tsx';
import { LocalDeck } from './components/LocalDeck.tsx';
import { LocalDetails } from './components/LocalDetails.tsx';
import { toHeartRateSettings, type HeartRateForm } from './heart-rate-form.ts';
import { MetricsGrid } from './components/MetricsGrid.tsx';
import { PayloadPreview } from './components/PayloadPreview.tsx';
import { PrivacyPanel } from './components/PrivacyPanel.tsx';
import { WeekLoad } from './components/WeekLoad.tsx';
import { useNetworkLog } from './network/useNetworkLog.ts';
import { SAMPLE_ATHLETE } from './samples.ts';
import { useActivities } from './useActivities.ts';
import styles from './local.module.css';

const INITIAL_HR: HeartRateForm = {
  maxHr: SAMPLE_ATHLETE.maxHr,
  useAge: false,
  age: 18,
  restHr: SAMPLE_ATHLETE.restHr,
  coefficient: 'male',
};

export default function LocalPage() {
  const t = cs.local;
  const [log] = useState(() => createTraceLog());
  const events = useSyncExternalStore(log.subscribe, log.getSnapshot);
  const { monitor, snapshot } = useNetworkLog();
  const acts = useActivities(monitor, log);
  const coach = useCoach(monitor, log);
  const [radius, setRadius] = useState(DEFAULT_PRIVACY_RADIUS_M);
  const [hrForm, setHrForm] = useState(INITIAL_HR);
  const [dragging, setDragging] = useState(false);
  const settings = useMemo(() => toHeartRateSettings(hrForm), [hrForm]);

  const selected = acts.selected;
  // The privacy zone runs first; every number below is computed from the trimmed track only.
  const zone = useMemo(
    () => (selected ? protect(selected.parsed, radius) : undefined),
    [selected, radius],
  );
  const metrics = useMemo(
    () => (zone ? computeMetrics(zone.activity, settings) : undefined),
    [zone, settings],
  );

  const week = useMemo(() => {
    const entries: LoadEntry[] = acts.activities.flatMap((a) => {
      const points = protect(a.parsed, radius).activity.points;
      const value = trimp(points, settings);
      return value === null || !points[0] ? [] : [{ start: points[0].time, trimp: value }];
    });
    const days = weekLoad(entries);
    const inWeek = entries.filter((e) => days.some((d) => d.day === dayKey(e.start)));
    return {
      entries,
      days,
      acwr: acwr(entries),
      summary: { activities: inWeek.length, trimpTotal: inWeek.reduce((s, e) => s + e.trimp, 0) },
    };
  }, [acts.activities, radius, settings]);

  const input: CoachInput | undefined = useMemo(
    () =>
      metrics && zone && !zone.allInside
        ? toCoachInput(metrics, settings, week.summary)
        : undefined,
    [metrics, zone, settings, week.summary],
  );
  const template = useMemo(() => (input ? templateExplanation(input) : []), [input]);

  /** Every model call is preceded by a trace event saying what the privacy zone removed. */
  const traced = {
    ...coach,
    explain: (i: CoachInput) => {
      emitPrivacy();
      return coach.explain(i);
    },
    ask: (i: CoachInput, q: string) => {
      emitPrivacy();
      return coach.ask(i, q);
    },
  };
  function emitPrivacy() {
    if (!zone) return;
    log.emit({
      type: 'info',
      name: 'privacy_zone',
      output: {
        radiusM: zone.radiusM,
        removedPoints: zone.removed.start.length + zone.removed.end.length,
        keptPoints: zone.activity.points.length,
        sentToModel: 'aggregates only',
      },
    });
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) void acts.addFiles(files);
  };
  const empty = (
    <p className={styles.empty}>
      <Sprite sprite={watch} scale={2} />
      {t.machine.empty}
    </p>
  );

  return (
    <ProjectShell
      id="local"
      info={<LocalDetails network={snapshot} coach={traced} events={events} />}
    >
      <section
        className={styles.machine}
        aria-label={t.machine.label}
        data-dragging={dragging ? '' : undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragging(false);
        }}
        onDrop={onDrop}
      >
        <LocalDeck
          activities={acts.activities}
          selectedKey={selected?.key}
          errors={acts.errors}
          reading={acts.reading}
          network={snapshot}
          onSamples={(ids) => void acts.addSamples(ids)}
          onFiles={(files) => void acts.addFiles(files)}
          onSelect={acts.select}
          onRemove={acts.remove}
        />

        {/* A new activity replays the machine: fog, numbers, the message, the coach. */}
        <ol key={selected?.key ?? 'none'} className={styles.pipeline}>
          <Panel step={1} tone="leaf" title={t.machine.steps.route}>
            {selected && zone ? (
              <PrivacyPanel
                original={selected.parsed}
                label={selected.label}
                protectedActivity={zone}
                radius={radius}
                maxHr={settings.maxHr}
                onRadius={setRadius}
              />
            ) : (
              empty
            )}
          </Panel>

          <li className={machine.arrow} aria-hidden="true">
            <span className={machine.arrowStop}>
              <Sprite sprite={calculator} scale={2} />
              <span>{t.machine.stops.code}</span>
            </span>
            {selected && (
              <span className={machine.traveller} data-leg="1">
                <Sprite sprite={chart} scale={2} />
              </span>
            )}
          </li>

          <Panel
            step={2}
            tone="sun"
            title={t.machine.steps.numbers}
            extra={
              metrics && (
                <HeartRateSettings
                  form={hrForm}
                  onForm={setHrForm}
                  isSample={
                    selected?.sample !== undefined &&
                    !hrForm.useAge &&
                    hrForm.maxHr === INITIAL_HR.maxHr
                  }
                />
              )
            }
          >
            {metrics ? (
              <div className={styles.numbers}>
                <MetricsGrid metrics={metrics} />
                <ZonesBar zonesS={metrics.zonesS} />
                {hrForm.useAge && <p className={styles.warning}>{t.hr.estimateWarning}</p>}
                {week.entries.length > 1 && <WeekLoad days={week.days} acwr={week.acwr} />}
              </div>
            ) : (
              empty
            )}
          </Panel>

          <li className={`${machine.arrow} ${styles.turn}`} aria-hidden="true" />

          <Panel step={3} tone="berry" title={t.machine.steps.payload}>
            {selected && input ? (
              <PayloadPreview
                points={selected.parsed.points.length}
                fileBytes={selected.fileBytes}
                input={input}
              />
            ) : (
              empty
            )}
          </Panel>

          <li className={machine.arrow} aria-hidden="true">
            <span className={machine.arrowStop}>
              <Sprite sprite={localThumb} scale={1} />
              <span>{t.machine.stops.device}</span>
            </span>
            {input && (
              <span className={machine.traveller} data-leg="2">
                <Sprite sprite={envelope} scale={2} />
              </span>
            )}
          </li>

          <Panel step={4} tone="sky" title={t.machine.steps.coach}>
            <CoachPanel coach={traced} input={input} template={template} />
          </Panel>
        </ol>
      </section>
    </ProjectShell>
  );
}
