import { useState, type DragEvent } from 'react';
import { cs } from '../../../i18n/cs.ts';
import type { LoadedActivity } from '../useActivities.ts';
import { SAMPLES, type SampleId } from '../samples.ts';
import styles from '../local.module.css';

interface Props {
  activities: LoadedActivity[];
  selectedKey: string | undefined;
  errors: string[];
  reading: boolean;
  onSamples: (ids: SampleId[]) => void;
  onFiles: (files: File[]) => void;
  onSelect: (key: string) => void;
  onRemove: (key: string) => void;
}

export function ActivityPicker(props: Props) {
  const t = cs.local.pick;
  const [dragging, setDragging] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) props.onFiles(files);
  };

  return (
    <section className={styles.section} aria-labelledby="pick-heading">
      <h2 id="pick-heading">{t.heading}</h2>
      <p>{t.intro}</p>

      <div className={styles.samples} role="group" aria-label={t.samplesLabel}>
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={styles.sampleCard}
            onClick={() => props.onSamples([s.id])}
          >
            <span className={styles.sampleTitle}>{t.samples[s.id].title}</span>
            <span className={styles.small}>{t.samples[s.id].detail}</span>
          </button>
        ))}
        <button
          type="button"
          className={`${styles.sampleCard} ${styles.sampleWeek}`}
          onClick={() => props.onSamples(SAMPLES.map((s) => s.id))}
        >
          <span className={styles.sampleTitle}>{t.week}</span>
          <span className={styles.small}>GPX + TCX + FIT</span>
        </button>
      </div>
      <p className={styles.small}>{t.syntheticNote}</p>

      <label
        className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <span>
          {t.drop} <span className={styles.link}>{t.browse}</span>
        </span>
        <span className={styles.small}>{t.dropHint}</span>
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

      {props.reading && <p role="status">{t.reading}</p>}
      {props.errors.map((error) => (
        <p key={error} role="alert" className={styles.error}>
          {error}
        </p>
      ))}

      {props.activities.length > 0 && (
        <div className={styles.loaded}>
          <span className={styles.groupLabel}>{t.loadedLabel}</span>
          <ul className={styles.chips}>
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
        </div>
      )}
    </section>
  );
}
