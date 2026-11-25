import { cs } from '../../../i18n/cs.ts';
import { formatPace, type ActivityMetrics } from '../activity/summary.ts';
import { formatDecimal, formatDistance, formatDuration, formatInt } from '../format.ts';
import styles from '../local.module.css';

interface Card {
  label: string;
  value: string;
  unit?: string;
  hint: string;
}

export function MetricsGrid({ metrics: m }: { metrics: ActivityMetrics }) {
  const t = cs.local.metrics;
  const none = t.none;
  const cards: Card[] = [
    {
      label: t.distance.label,
      value: m.distanceM === null ? none : formatDistance(m.distanceM),
      hint: t.distance.hint,
    },
    {
      label: t.moving.label,
      value: formatDuration(m.movingS ?? m.elapsedS),
      hint: t.moving.hint(formatDuration(m.elapsedS)),
    },
    m.sport === 'ride'
      ? {
          label: t.speed.label,
          value: m.speedKmH === null ? none : formatDecimal(m.speedKmH),
          unit: m.speedKmH === null ? undefined : 'km/h',
          hint: t.speed.hint,
        }
      : {
          label: t.pace.label,
          value: m.paceSPerKm === null ? none : formatPace(m.paceSPerKm),
          unit: m.paceSPerKm === null ? undefined : 'min/km',
          hint: t.pace.hint,
        },
    {
      label: t.climb.label,
      value: m.elevation === null ? none : formatInt(m.elevation.gain),
      unit: m.elevation === null ? undefined : 'm',
      hint: t.climb.hint,
    },
    {
      label: t.hr.label,
      value: m.hr === null ? none : formatInt(m.hr.avg),
      unit: m.hr === null ? undefined : cs.local.hr.bpm,
      hint: m.hr === null ? t.noHr : t.hr.hint(Math.round(m.hr.max)),
    },
    {
      label: t.trimp.label,
      value: m.trimp === null ? none : formatInt(m.trimp),
      hint: t.trimp.hint,
    },
  ];
  return (
    <dl className={styles.metrics} data-testid="metrics">
      {cards.map((c) => (
        <div key={c.label} className={styles.metric}>
          <dt className={styles.metricLabel}>{c.label}</dt>
          <dd className={styles.metricValue}>
            {c.value}
            {c.unit && <span className={styles.metricUnit}> {c.unit}</span>}
          </dd>
          <dd className={styles.metricHint}>{c.hint}</dd>
        </div>
      ))}
    </dl>
  );
}
