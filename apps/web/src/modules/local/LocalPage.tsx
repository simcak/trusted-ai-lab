import { createTraceLog } from '@trusted-ai-lab/llm-core';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { ProjectShell } from '../../components/ProjectShell/ProjectShell.tsx';
import { TracePanel } from '../../components/TracePanel/TracePanel.tsx';
import { cs } from '../../i18n/cs.ts';
import { acwr, weekLoad, dayKey, type LoadEntry } from './activity/load.ts';
import { DEFAULT_PRIVACY_RADIUS_M, protect } from './activity/privacy.ts';
import { computeMetrics, toCoachInput, type CoachInput } from './activity/summary.ts';
import { trimp } from './activity/heart-rate.ts';
import { templateExplanation } from './coach/template.ts';
import { useCoach } from './coach/useCoach.ts';
import { ActivityPicker } from './components/ActivityPicker.tsx';
import { CoachPanel } from './components/CoachPanel.tsx';
import { HeartRatePanel } from './components/HeartRatePanel.tsx';
import { toHeartRateSettings, type HeartRateForm } from './heart-rate-form.ts';
import { MetricsGrid } from './components/MetricsGrid.tsx';
import { NetworkPanel } from './components/NetworkPanel.tsx';
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

  return (
    <ProjectShell id="local">
      <div className={styles.page}>
        <ActivityPicker
          activities={acts.activities}
          selectedKey={selected?.key}
          errors={acts.errors}
          reading={acts.reading}
          onSamples={(ids) => void acts.addSamples(ids)}
          onFiles={(files) => void acts.addFiles(files)}
          onSelect={acts.select}
          onRemove={acts.remove}
        />

        {selected && zone && (
          <PrivacyPanel
            original={selected.parsed}
            label={selected.label}
            protectedActivity={zone}
            radius={radius}
            maxHr={settings.maxHr}
            onRadius={setRadius}
          />
        )}

        {metrics && (
          <section className={styles.section} aria-labelledby="metrics-heading">
            <h2 id="metrics-heading">{t.metrics.heading}</h2>
            <p>{t.metrics.intro}</p>
            <MetricsGrid metrics={metrics} />
            <HeartRatePanel
              form={hrForm}
              onForm={setHrForm}
              zonesS={metrics.zonesS}
              isSample={
                selected?.sample !== undefined &&
                !hrForm.useAge &&
                hrForm.maxHr === INITIAL_HR.maxHr
              }
            />
            {week.entries.length > 1 && <WeekLoad days={week.days} acwr={week.acwr} />}
          </section>
        )}

        {selected && input && (
          <PayloadPreview
            points={selected.parsed.points.length}
            fileBytes={selected.fileBytes}
            input={input}
          />
        )}

        <CoachPanel coach={traced} input={input} template={template} />

        <NetworkPanel snapshot={snapshot} />

        <section className={styles.section} aria-labelledby="limits-heading">
          <h2 id="limits-heading">{t.limits.heading}</h2>
          <ul className={styles.list}>
            {t.limits.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {events.length > 0 && (
          <details className={styles.details}>
            <summary>{t.traceSummary}</summary>
            <TracePanel events={events} title={t.traceTitle} headingLevel={3} />
          </details>
        )}
      </div>
    </ProjectShell>
  );
}
