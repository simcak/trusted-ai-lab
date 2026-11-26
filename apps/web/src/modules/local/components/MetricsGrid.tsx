import type { CSSProperties } from 'react';
import { InfoTip } from '../../../components/InfoTip/InfoTip.tsx';
import machine from '../../../components/Machine/machine.module.css';
import type { Tone } from '../../../components/Machine/Panel.tsx';
import { cs } from '../../../i18n/cs.ts';
import { formatPace, type ActivityMetrics } from '../activity/summary.ts';
import { formatDecimal, formatDistance, formatDuration, formatInt } from '../format.ts';
import styles from '../local.module.css';

interface Card {
  label: string;
  value: string;
  unit?: string | undefined;
  hint: string;
  tone: Tone;
}

/** Step 2: what plain code computed, one coloured tile per number; the explanation on demand. */
export function MetricsGrid({ metrics: m }: { metrics: ActivityMetrics }) {
  const t = cs.local.metrics;
  const none = t.none;
  const cards: Card[] = [
    {
      label: t.distance.label,
      value: m.distanceM === null ? none : formatDistance(m.distanceM),
      hint: t.distance.hint,
      tone: 'sky',
    },
    {
      label: t.moving.label,
      value: formatDuration(m.movingS ?? m.elapsedS),
      hint: t.moving.hint(formatDuration(m.elapsedS)),
      tone: 'sun',
    },
    m.sport === 'ride'
      ? {
          label: t.speed.label,
          value: m.speedKmH === null ? none : formatDecimal(m.speedKmH),
          unit: m.speedKmH === null ? undefined : 'km/h',
          hint: t.speed.hint,
          tone: 'leaf',
        }
      : {
          label: t.pace.label,
          value: m.paceSPerKm === null ? none : formatPace(m.paceSPerKm),
          unit: m.paceSPerKm === null ? undefined : 'min/km',
          hint: t.pace.hint,
          tone: 'leaf',
        },
    {
      label: t.climb.label,
      value: m.elevation === null ? none : formatInt(m.elevation.gain),
      unit: m.elevation === null ? undefined : 'm',
      hint: t.climb.hint,
      tone: 'ember',
    },
    {
      label: t.hr.label,
      value: m.hr === null ? none : formatInt(m.hr.avg),
      unit: m.hr === null ? undefined : cs.local.hr.bpm,
      hint: m.hr === null ? t.noHr : t.hr.hint(Math.round(m.hr.max)),
      tone: 'berry',
    },
    {
      label: t.trimp.label,
      value: m.trimp === null ? none : formatInt(m.trimp),
      hint: m.trimp === null ? t.noHr : t.trimp.hint,
      tone: 'sun',
    },
  ];
  return (
    <dl className={styles.metrics} data-testid="metrics">
      {cards.map((c, i) => (
        <div
          key={c.label}
          className={`${styles.metric} ${machine.tone}`}
          data-tone={c.tone}
          style={{ '--i': i } as CSSProperties}
        >
          <dt className={styles.metricLabel}>
            {c.label}
            <InfoTip label={cs.local.machine.metricTip(c.label)} title={c.label}>
              <p>{c.hint}</p>
            </InfoTip>
          </dt>
          <dd className={styles.metricValue}>
            {c.value}
            {c.unit && <span className={styles.metricUnit}> {c.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
