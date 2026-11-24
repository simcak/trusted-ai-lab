import { cs } from '../../../i18n/cs.ts';
import { distanceMeters } from '../activity/metrics.ts';
import { MAX_PRIVACY_RADIUS_M, type ProtectedActivity } from '../activity/privacy.ts';
import type { ParsedActivity } from '../activity/types.ts';
import { formatDistance } from '../format.ts';
import styles from '../local.module.css';
import { RouteMap } from './RouteMap.tsx';

interface Props {
  original: ParsedActivity;
  label: string;
  protectedActivity: ProtectedActivity;
  radius: number;
  maxHr: number;
  onRadius: (m: number) => void;
}

/** Length of a trimmed part, including the step to the first (or from the last) kept point. */
const trimmedLength = (points: ParsedActivity['points']) => distanceMeters(points) ?? 0;

export function PrivacyPanel({
  original,
  label,
  protectedActivity: p,
  radius,
  maxHr,
  onRadius,
}: Props) {
  const t = cs.local.privacy;
  const hasGps = original.points.some((pt) => pt.lat !== undefined);
  const kept = p.activity.points;
  const first = kept[0];
  const last = kept.at(-1);
  const start = trimmedLength(first ? [...p.removed.start, first] : p.removed.start);
  const end = trimmedLength(last ? [last, ...p.removed.end] : p.removed.end);

  let status: string;
  if (!hasGps) status = t.noGps;
  else if (radius === 0) status = t.off;
  else if (p.allInside) status = t.allInside;
  else status = t.trimmed(formatDistance(start), formatDistance(end));

  return (
    <section className={styles.section} aria-labelledby="privacy-heading">
      <h2 id="privacy-heading">{t.heading}</h2>
      <p>{t.intro}</p>

      {hasGps && (
        <div className={styles.mapWrap}>
          <RouteMap
            kept={kept}
            removed={[p.removed.start, p.removed.end]}
            maxHr={maxHr}
            label={t.mapLabel(label)}
          />
          <label className={styles.slider}>
            <span>
              {t.radius}: <strong>{t.radiusValue(radius)}</strong>
            </span>
            <input
              type="range"
              min={0}
              max={MAX_PRIVACY_RADIUS_M}
              step={50}
              value={radius}
              onChange={(e) => onRadius(Number(e.currentTarget.value))}
            />
          </label>
        </div>
      )}
      <p role="status" data-testid="privacy-status">
        {status}
      </p>

      <p className={styles.small}>
        {original.droppedMetadata.length === 0
          ? t.droppedNone
          : `${t.dropped} ${original.droppedMetadata.map((k) => t.metadata[k]).join(', ')}.`}
      </p>
    </section>
  );
}
