import { hasLatLon } from '@trusted-ai-lab/pii-cz';
import { useId } from 'react';
import { compileSprite } from '../../../pixel/pixel-art.ts';
import { Sprite } from '../../../pixel/Sprite.tsx';
import { house } from '../../../pixel/sprites/hero.ts';
import { zoneOf } from '../activity/heart-rate.ts';
import type { TrackPoint } from '../activity/types.ts';
import styles from '../local.module.css';

interface Props {
  kept: TrackPoint[];
  removed: TrackPoint[][];
  maxHr: number;
  label: string;
  /** Privacy zone radius in metres: fog over the start and the finish. */
  radius: number;
}

/** Metres per degree of latitude (the map is small, a sphere is precise enough). */
const M_PER_DEG = 111_320;
const HOUSE = compileSprite(house);

const WIDTH = 640;
const HEIGHT = 360;
const PAD = 16;

/**
 * The track drawn as plain SVG, without map tiles: tiles would be network requests that reveal
 * where the activity happened. Colour = heart-rate zone; trimmed parts are faded.
 */
export function RouteMap({ kept, removed, maxHr, label, radius }: Props) {
  const fogId = `fog-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
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
  const xy = (p: { lat: number; lon: number }) =>
    [offX + (p.lon * kx - minX) * scale, offY + (-p.lat - minY) * scale] as const;
  const project = (p: { lat: number; lon: number }) => {
    const [x, y] = xy(p);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };
  // Where the recording really started and ended: often at home. The fog covers those spots.
  const first = [...(removed[0] ?? []), ...kept].find(hasLatLon);
  const last = [...kept, ...(removed[1] ?? [])].filter(hasLatLon).at(-1);
  const fogR = (radius / M_PER_DEG) * scale;
  const ends = radius > 0 ? [first, last].filter((p) => p !== undefined) : [];

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
      <defs>
        <pattern id={fogId} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" className={styles.fogBase} />
          <rect width="2" height="2" className={styles.fogDot} />
          <rect x="2" y="2" width="2" height="2" className={styles.fogDot} />
        </pattern>
      </defs>
      {first && (
        <g
          transform={`translate(${(xy(first)[0] - HOUSE.width / 2).toFixed(1)} ${(xy(first)[1] - HOUSE.height / 2).toFixed(1)})`}
        >
          <Sprite sprite={house} scale={1} />
        </g>
      )}
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
      {ends.map((p, i) => {
        const [cx, cy] = xy(p);
        return (
          <circle
            key={i}
            className={styles.fog}
            style={{ animationDelay: `${i * 200}ms` }}
            cx={cx.toFixed(1)}
            cy={cy.toFixed(1)}
            r={fogR.toFixed(1)}
            fill={`url(#${fogId})`}
          />
        );
      })}
    </svg>
  );
}
