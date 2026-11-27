import type { CSSProperties } from 'react';
import { InfoTip } from '../../../components/InfoTip/InfoTip.tsx';
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

/** With more activities: training load per day as bars, ACWR with its caveat on demand. */
export function WeekLoad({ days, acwr }: Props) {
  const t = cs.local.week;
  const m = cs.local.machine;
  const max = Math.max(1, ...days.map((d) => d.trimp));
  const total = days.reduce((s, d) => s + d.trimp, 0);
  return (
    <div className={styles.week}>
      <p className={styles.weekHead}>
        <strong>{t.heading}</strong> <span>{t.total(Math.round(total))}</span>
      </p>
      <ol className={styles.weekBars} aria-label={t.chartLabel}>
        {days.map((d, i) => (
          <li key={d.day}>
            <span className={styles.weekValue}>{d.trimp > 0 ? formatInt(d.trimp) : ''}</span>
            <span
              className={styles.weekBar}
              style={{ height: `${(100 * d.trimp) / max}%`, '--i': i } as CSSProperties}
            />
            <span className={styles.weekDay}>{weekday.format(new Date(`${d.day}T00:00:00Z`))}</span>
          </li>
        ))}
      </ol>
      <div className={styles.acwr}>
        <span>
          {acwr.status === 'ok'
            ? t.acwrValue(formatRatio(acwr.ratio))
            : t.acwrInsufficient(acwr.spanDays)}
        </span>
        <span className={styles.disputed}>{m.disputed}</span>
        <InfoTip label={m.acwrTip} title={t.acwrLabel}>
          <p>{t.intro}</p>
          <p>{t.acwrNote}</p>
        </InfoTip>
      </div>
    </div>
  );
}
