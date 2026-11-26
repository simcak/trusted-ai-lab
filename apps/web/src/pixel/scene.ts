/**
 * A tiny timeline over the Web Animations API: every track lists [time in ms, keyframe] pairs
 * on one shared clock, so a whole scene stays in sync and can be paused as one.
 */
export type SceneKeyframe = Record<string, string | number>;

export interface SceneTrack {
  target: Element | null | undefined;
  /** Ascending times. Values hold before the first and after the last key. */
  keys: ReadonlyArray<readonly [ms: number, frame: SceneKeyframe]>;
}

export interface SceneTimeline {
  duration: number;
  tracks: readonly SceneTrack[];
}

/** WAAPI keyframes with offsets, padded so values hold at both ends. */
export function toKeyframes(
  keys: SceneTrack['keys'],
  duration: number,
): Array<SceneKeyframe & { offset: number }> {
  if (keys.length === 0) return [];
  const frames = keys.map(([ms, frame]) => ({
    ...frame,
    offset: Math.min(1, Math.max(0, ms / duration)),
  }));
  const first = frames[0]!;
  const last = frames[frames.length - 1]!;
  if (first.offset > 0) frames.unshift({ ...withoutEasing(first), offset: 0 });
  if (last.offset < 1) frames.push({ ...withoutEasing(last), offset: 1 });
  return frames;
}

function withoutEasing(frame: SceneKeyframe): SceneKeyframe {
  const { easing: _easing, offset: _offset, ...rest } = frame;
  return rest;
}

/** Starts every track; returns the animations (empty where WAAPI is missing, e.g. jsdom). */
export function playTimeline(
  timeline: SceneTimeline,
  options: { iterations?: number } = {},
): Animation[] {
  const animations: Animation[] = [];
  for (const track of timeline.tracks) {
    const el = track.target;
    if (!el || typeof el.animate !== 'function') continue;
    animations.push(
      el.animate(toKeyframes(track.keys, timeline.duration), {
        duration: timeline.duration,
        iterations: options.iterations ?? Infinity,
        fill: 'both',
      }),
    );
  }
  return animations;
}
