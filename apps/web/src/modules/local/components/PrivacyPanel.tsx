import { InfoTip } from '../../../components/InfoTip/InfoTip.tsx';
import machine from '../../../components/Machine/machine.module.css';
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

/** Step 1: the route with its start and finish hidden in fog, and the size of the fog. */
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
    <div className={styles.route}>
      {hasGps && (
        <>
          <RouteMap
            kept={kept}
            removed={[p.removed.start, p.removed.end]}
            maxHr={maxHr}
            label={t.mapLabel(label)}
            radius={radius}
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
        </>
      )}
      <div className={styles.status}>
        <p role="status" data-testid="privacy-status" data-off={radius === 0 ? '' : undefined}>
          {status}
        </p>
        <InfoTip label={cs.local.machine.droppedTip} title={cs.local.machine.droppedTip}>
          <p>{t.intro}</p>
          <p className={machine.small}>
            {original.droppedMetadata.length === 0
              ? t.droppedNone
              : `${t.dropped} ${original.droppedMetadata.map((k) => t.metadata[k]).join(', ')}.`}
          </p>
        </InfoTip>
      </div>
    </div>
  );
}
