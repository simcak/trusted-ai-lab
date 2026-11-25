import { cs } from '../../../i18n/cs.ts';
import type { AcwrResult } from '../activity/load.ts';
import { formatInt, formatRatio } from '../format.ts';
import styles from '../local.module.css';

const weekday = new Intl.DateTimeFormat('cs-CZ', {
  weekday: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

interface Props {
  days: { day: string; trimp: number }[];
  acwr: AcwrResult;
}

export function WeekLoad({ days, acwr }: Props) {
  const t = cs.local.week;
  const max = Math.max(1, ...days.map((d) => d.trimp));
  const total = days.reduce((s, d) => s + d.trimp, 0);
  return (
    <div className={styles.week}>
      <h3>{t.heading}</h3>
      <p>{t.intro}</p>
      <ol className={styles.weekBars} aria-label={t.chartLabel}>
        {days.map((d) => (
          <li key={d.day}>
            <span className={styles.weekValue}>{d.trimp > 0 ? formatInt(d.trimp) : ''}</span>
            <span className={styles.weekBar} style={{ height: `${(100 * d.trimp) / max}%` }} />
            <span className={styles.weekDay}>{weekday.format(new Date(`${d.day}T00:00:00Z`))}</span>
          </li>
        ))}
      </ol>
      <p>{t.total(Math.round(total))}</p>
      <p>
        <strong>{t.acwrLabel}:</strong>{' '}
        {acwr.status === 'ok'
          ? t.acwrValue(formatRatio(acwr.ratio))
          : t.acwrInsufficient(acwr.spanDays)}
      </p>
      <p className={styles.small}>{t.acwrNote}</p>
    </div>
  );
}
