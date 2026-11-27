import { InfoTip } from '../../../components/InfoTip/InfoTip.tsx';
import machine from '../../../components/Machine/machine.module.css';
import { cs } from '../../../i18n/cs.ts';
import type { NetworkSnapshot } from '../network/network-monitor.ts';
import { SAMPLES, type SampleId } from '../samples.ts';
import type { LoadedActivity } from '../useActivities.ts';
import styles from '../local.module.css';
import { NetworkLed } from './NetworkLed.tsx';

interface Props {
  activities: LoadedActivity[];
  selectedKey: string | undefined;
  errors: string[];
  reading: boolean;
  network: NetworkSnapshot;
  onSamples: (ids: SampleId[]) => void;
  onFiles: (files: File[]) => void;
  onSelect: (key: string) => void;
  onRemove: (key: string) => void;
}

/** Which training: three samples, the whole week, or an own file. And the network light. */
export function LocalDeck(props: Props) {
  const t = cs.local.pick;
  const m = cs.local.machine;
  const selected = props.activities.find((a) => a.key === props.selectedKey);
  const week = SAMPLES.every((s) => props.activities.some((a) => a.sample === s.id));

  return (
    <div className={styles.deck}>
      <div className={machine.group} role="group" aria-label={m.samplesLabel}>
        <div className={machine.groupLabel}>
          <span aria-hidden="true">{m.samplesLabel}</span>
          <InfoTip label={m.samplesTip} title={m.samplesTip} icon="bulb">
            <p>{t.syntheticNote}</p>
          </InfoTip>
        </div>
        <div className={machine.choices}>
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={machine.choice}
              aria-pressed={selected?.sample === s.id}
              onClick={() => props.onSamples([s.id])}
            >
              {t.samples[s.id].title}
              <span className={styles.choiceMeta}> {t.samples[s.id].detail}</span>
            </button>
          ))}
          <button
            type="button"
            className={machine.choice}
            aria-pressed={week && props.activities.length > 1}
            onClick={() => props.onSamples(SAMPLES.map((s) => s.id))}
          >
            {t.week}
          </button>
          <label className={`${machine.choice} ${styles.own}`}>
            <span aria-hidden="true">＋ </span>
            {m.own}
            <input
              type="file"
              className="visually-hidden"
              accept=".gpx,.tcx,.fit,application/gpx+xml,application/vnd.garmin.tcx+xml"
              multiple
              data-testid="activity-file"
              onChange={(e) => {
                const files = Array.from(e.currentTarget.files ?? []);
                e.currentTarget.value = '';
                if (files.length) props.onFiles(files);
              }}
            />
          </label>
          <InfoTip label={m.ownTip} title={m.ownTip}>
            <p>{m.ownHint}</p>
          </InfoTip>
        </div>

        {props.activities.length > 1 && (
          <ul className={styles.loaded} aria-label={t.loadedLabel}>
            {props.activities.map((a) => (
              <li key={a.key} className={styles.chip}>
                <button
                  type="button"
                  aria-pressed={a.key === props.selectedKey}
                  onClick={() => props.onSelect(a.key)}
                >
                  {a.label}
                  <span className={styles.chipMeta}>{a.parsed.format.toUpperCase()}</span>
                </button>
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={t.remove(a.label)}
                  onClick={() => props.onRemove(a.key)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {props.reading && <p role="status">{t.reading}</p>}
        {props.errors.map((error) => (
          <p key={error} role="alert" className={styles.error}>
            {error}
          </p>
        ))}
      </div>

      <NetworkLed snapshot={props.network} />
    </div>
  );
}
