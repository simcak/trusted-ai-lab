import { hasLatLon } from '@trusted-ai-lab/pii-cz';
import { zoneOf } from '../activity/heart-rate.ts';
import type { TrackPoint } from '../activity/types.ts';
import styles from '../local.module.css';

interface Props {
  kept: TrackPoint[];
  removed: TrackPoint[][];
  maxHr: number;
  label: string;
}

const WIDTH = 640;
const HEIGHT = 360;
const PAD = 16;

/**
 * The track drawn as plain SVG, without map tiles: tiles would be network requests that reveal
 * where the activity happened. Colour = heart-rate zone; trimmed parts are faded.
 */
export function RouteMap({ kept, removed, maxHr, label }: Props) {
  const all = [...kept, ...removed.flat()].filter(hasLatLon);
  if (all.length < 2) return null;

  const lat0 = all.reduce((s, p) => s + p.lat, 0) / all.length;
  const kx = Math.cos((lat0 * Math.PI) / 180);
  const xs = all.map((p) => p.lon * kx);
  const ys = all.map((p) => -p.lat);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX || 1e-9;
  const spanY = Math.max(...ys) - minY || 1e-9;
  const scale = Math.min((WIDTH - 2 * PAD) / spanX, (HEIGHT - 2 * PAD) / spanY);
  const offX = (WIDTH - spanX * scale) / 2;
  const offY = (HEIGHT - spanY * scale) / 2;
  const project = (p: { lat: number; lon: number }) =>
    `${(offX + (p.lon * kx - minX) * scale).toFixed(1)},${(offY + (-p.lat - minY) * scale).toFixed(1)}`;

  // Consecutive points of the same zone become one polyline (a few dozen elements, not thousands).
  const runs: { zone: number; points: string[] }[] = [];
  const gps = kept.filter(hasLatLon);
  for (const [i, p] of gps.entries()) {
    const zone = p.hr === undefined ? -1 : zoneOf(p.hr, maxHr);
    const last = runs.at(-1);
    const xy = project(p);
    if (last && last.zone === zone) last.points.push(xy);
    else {
      const prev = gps[i - 1];
      runs.push({ zone, points: prev ? [project(prev), xy] : [xy] });
    }
  }

  return (
    <svg
      className={styles.map}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
      data-testid="route-map"
    >
      {removed.map((part, i) => {
        const pts = part.filter(hasLatLon);
        return pts.length > 1 ? (
          <polyline key={i} className={styles.mapHidden} points={pts.map(project).join(' ')} />
        ) : null;
      })}
      {runs.map((run, i) => (
        <polyline
          key={i}
          className={styles.mapTrack}
          style={{ stroke: run.zone < 0 ? 'var(--color-accent)' : `var(--zone-${run.zone})` }}
          points={run.points.join(' ')}
        />
      ))}
    </svg>
  );
}
