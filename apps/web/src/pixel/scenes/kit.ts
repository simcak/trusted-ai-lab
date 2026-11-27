import type { SceneKeyframe, SceneTimeline, SceneTrack } from '../scene.ts';

/** Every scene is drawn on the same 400 × 180 art-pixel world. */
export const WORLD = { w: 400, h: 180 } as const;

export type Keys = Array<readonly [number, SceneKeyframe]>;
export type Point = readonly [number, number];

export const at = ([x, y]: Point): SceneKeyframe => ({ transform: `translate(${x}px, ${y}px)` });

/** SVG transform attribute for a still position. */
export const place = ([x, y]: Point) => `translate(${x} ${y})`;

/** Hops along a line: up on odd steps. */
export function walk(from: Point, to: Point, t0: number, t1: number, hops: number): Keys {
  const keys: Keys = [];
  const steps = hops * 2;
  for (let i = 0; i <= steps; i += 1) {
    const f = i / steps;
    const x = from[0] + (to[0] - from[0]) * f;
    const y = from[1] + (to[1] - from[1]) * f - (i % 2 ? 3 : 0);
    keys.push([t0 + (t1 - t0) * f, at([Math.round(x), Math.round(y)])]);
  }
  return keys;
}

/** A parabolic flight sampled in `steps` segments. */
export function fly(from: Point, to: Point, t0: number, t1: number, lift: number, steps = 8): Keys {
  const keys: Keys = [];
  for (let i = 0; i <= steps; i += 1) {
    const f = i / steps;
    const x = from[0] + (to[0] - from[0]) * f;
    const y = from[1] + (to[1] - from[1]) * f - lift * 4 * f * (1 - f);
    keys.push([t0 + (t1 - t0) * f, at([Math.round(x), Math.round(y)])]);
  }
  return keys;
}

/** Opacity steps: [time, value] pairs. */
export const fade = (...pairs: Array<[number, number]>): Keys =>
  pairs.map(([t, opacity]) => [t, { opacity }] as const);

/** Shown from `from` to `to`. */
export const show = (from: number, to: number, duration: number): Keys =>
  fade([0, 0], [from, 0], [from + 1, 1], [to, 1], [Math.min(to + 1, duration), 0]);

/** A caption: shown between `from` and `to`, typed out in pixel steps. */
export function captionTracks(target: Element | null, from: number, to: number): SceneTrack[] {
  return [
    { target, keys: fade([0, 0], [from, 0], [from + 1, 1], [to, 1], [to + 1, 0]) },
    {
      target,
      keys: [
        [from, { clipPath: 'inset(0 100% 0 0)', easing: 'steps(24)' }],
        [from + 800, { clipPath: 'inset(0 0% 0 0)' }],
      ],
    },
  ];
}

/** Builds a timeline from `[part, keys]` pairs and caption windows. */
export function timeline(
  root: Element,
  duration: number,
  parts: Array<readonly [string, Keys]>,
  captions: Array<readonly [number, number]>,
): SceneTimeline {
  const part = (name: string) => root.querySelector(`[data-part="${name}"]`);
  return {
    duration,
    tracks: [
      ...parts.map(([name, keys]) => ({ target: part(name), keys })),
      ...captions.flatMap(([from, to], i) => captionTracks(part(`caption-${i}`), from, to)),
    ],
  };
}
