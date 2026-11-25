import type { SceneKeyframe, SceneTimeline, SceneTrack } from '../../pixel/scene.ts';

/** The landing scene: 400 × 180 art pixels, one loop of 12 s. */
export const WORLD = { w: 400, h: 180 } as const;
export const DURATION = 12_000;

/** Where things stand (top-left corners, art pixels). Also the still frame for reduced motion. */
export const POS = {
  house: [78, 121],
  gate: [183, 104],
  tower: [300, 88],
  door: [82, 140],
  atGate: [193, 140],
  mouth: [306, 104],
  gremlin: [222, 137],
  spark: [206, 126],
  bubble: [326, 70],
  heart: [92, 108],
  shield: [192, 104],
  dome: [96, 150, 46],
  window: [101, 141],
} as const satisfies Record<string, readonly number[]>;

type Keys = Array<readonly [number, SceneKeyframe]>;
type Point = readonly [number, number];

const at = ([x, y]: Point): SceneKeyframe => ({ transform: `translate(${x}px, ${y}px)` });

/** Hops along the path: up on odd steps. */
function walk(from: Point, to: Point, t0: number, t1: number, hops: number): Keys {
  const keys: Keys = [];
  const steps = hops * 2;
  for (let i = 0; i <= steps; i += 1) {
    const f = i / steps;
    const x = from[0] + (to[0] - from[0]) * f;
    const y = from[1] + (to[1] - from[1]) * f - (i % 2 ? 4 : 0);
    keys.push([t0 + (t1 - t0) * f, at([Math.round(x), Math.round(y)])]);
  }
  return keys;
}

/** A parabolic flight sampled in `steps` segments. */
function fly(from: Point, to: Point, t0: number, t1: number, lift: number, steps = 8): Keys {
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
const fade = (...pairs: Array<[number, number]>): Keys =>
  pairs.map(([t, opacity]) => [t, { opacity }] as const);

/** A caption: shown between `from` and `to`, typed out in pixel steps. */
function caption(from: number, to: number): Keys[] {
  return [
    fade([0, 0], [from, 0], [from + 1, 1], [to, 1], [to + 1, 0]),
    [
      [from, { clipPath: 'inset(0 100% 0 0)', easing: 'steps(24)' }],
      [from + 800, { clipPath: 'inset(0 0% 0 0)' }],
    ],
  ];
}

export function heroTimeline(root: Element): SceneTimeline {
  const part = (name: string) => root.querySelector(`[data-part="${name}"]`);
  const track = (name: string, keys: Keys): SceneTrack => ({ target: part(name), keys });
  const door = POS.door;
  const atGate = POS.atGate;
  const mouth = POS.mouth;

  const captions = [
    caption(0, 2600),
    caption(2700, 6200),
    caption(6300, 9100),
    caption(9200, 11900),
  ];

  return {
    duration: DURATION,
    tracks: [
      // 1. The letter leaves the house and walks to the gate.
      track('letter', [
        [0, at(door)],
        [800, at(door)],
        ...walk(door, atGate, 900, 3000, 5),
        [3800, at(atGate)],
        // 2. Scanned, masked, then flies to the AI.
        ...fly(atGate, mouth, 3900, 5500, 24),
      ]),
      track('letter', fade([0, 0], [800, 0], [900, 1], [5500, 1], [5700, 0])),
      track('letter-id', fade([0, 1], [3400, 1], [3401, 0])),
      track('letter-mask', fade([0, 0], [3400, 0], [3401, 1])),
      track('beam', [
        [0, { opacity: 0, transform: 'translate(0px, 122px)' }],
        [3000, { opacity: 0, transform: 'translate(0px, 122px)' }],
        [3050, { opacity: 1, transform: 'translate(0px, 122px)' }],
        [3400, { opacity: 1, transform: 'translate(0px, 147px)' }],
        [3750, { opacity: 1, transform: 'translate(0px, 122px)' }],
        [3800, { opacity: 0, transform: 'translate(0px, 122px)' }],
      ]),
      track(
        'field',
        fade(
          [0, 0],
          [3000, 0],
          [3050, 0.35],
          [3800, 0.35],
          [3850, 0],
          [8150, 0],
          [8200, 0.6],
          [8600, 0],
        ),
      ),
      // 3. The AI thinks and answers.
      track('bubble', fade([0, 0], [5500, 0], [5600, 1], [6500, 1], [6600, 0])),
      track('reply', [
        [0, at(mouth)],
        [6500, at(mouth)],
        ...fly(mouth, atGate, 6600, 8600, 18),
        [9200, at(atGate)],
        ...walk(atGate, door, 9200, 10800, 5),
      ]),
      track('reply', fade([0, 0], [6500, 0], [6600, 1], [10800, 1], [11000, 0])),
      track('reply-mask', fade([0, 1], [9000, 1], [9001, 0])),
      track('reply-id', fade([0, 0], [9000, 0], [9001, 1])),
      // 4. A gremlin (prompt injection) tries to ride along and bounces off the shield.
      track('gremlin', [
        [0, at([340, 137])],
        [6900, at([340, 137])],
        [7300, at([304, 124])],
        [7650, at([268, 137])],
        [7950, at([240, 122])],
        [8200, at([218, 132])],
        [8450, at([242, 110])],
        [8800, at([266, 137])],
      ]),
      track('gremlin', fade([0, 0], [6900, 0], [7000, 1], [8700, 1], [8900, 0])),
      track('spark', fade([0, 0], [8150, 0], [8200, 1], [8550, 1], [8600, 0])),
      track(
        'shield-flash',
        fade([0, 0], [8150, 0], [8200, 0.9], [8500, 0], [8950, 0], [9000, 0.9], [9300, 0]),
      ),
      // 5. Home: the dome lights up, health data stays inside.
      track('window-flare', fade([0, 0], [10800, 0], [10900, 0.9], [11600, 0])),
      track('dome', fade([0, 0], [10800, 0], [11100, 0.85], [11800, 0.85], [12000, 0])),
      track('dome-ring', fade([0, 0], [10800, 0], [11100, 0.85], [11800, 0.85], [12000, 0])),
      track('heart', fade([0, 0], [10900, 0], [11100, 1], [11800, 1], [12000, 0])),
      track('heart', [
        [10900, at([POS.heart[0], POS.heart[1] + 6])],
        [11300, at(POS.heart)],
      ]),
      ...captions.flatMap(([opacity, typing], i) => [
        track(`caption-${i}`, opacity!),
        track(`caption-${i}`, typing!),
      ]),
    ],
  };
}
