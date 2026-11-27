import { type PaletteKey } from '../../../pixel/palette.ts';
import { rectPath } from '../../../pixel/pixel-art.ts';
import { at, fade, fly, timeline, walk, type Point } from '../../../pixel/scenes/kit.ts';

/**
 * Lokálně: a runner trains and comes home. The start by the house hides in fog, the watch hands
 * the numbers to the computer under the dome, the AI there explains them, and the antenna on the
 * roof shows that nothing left: 0. The AI in the cloud gets nothing.
 */
export const POS = {
  house: [40, 121],
  window: [63, 141],
  laptop: [92, 127],
  door: [44, 138],
  far: [232, 138],
  back: [138, 138],
  watch: [139, 124],
  data: [140, 122],
  screen: [100, 130],
  bubble: [100, 110],
  tick: [104, 112],
  antenna: [53, 109],
  tower: [320, 88],
  question: [338, 72],
} as const satisfies Record<string, Point>;

export const DOME = { x: 80, y: 150, r: 56 } as const;
export const DURATION = 10_000;
export const LEDS = [116, 122, 128, 134, 140, 146];
export const LED_COLOURS: PaletteKey[] = ['px-leaf-2', 'px-sky-2', 'px-sun-2'];

/** Dots from the roof towards the cloud: the line nothing travels on. */
export const WIRE = Array.from({ length: 38 }, (_, i) => rectPath(72 + i * 6, 104, 3, 1)).join('');

export function localTimeline(root: Element) {
  return timeline(
    root,
    DURATION,
    [
      [
        'runner',
        [
          [0, at(POS.door)],
          [300, at(POS.door)],
          ...walk(POS.door, POS.far, 300, 1800, 8),
          ...walk(POS.far, POS.back, 1900, 3200, 6),
        ],
      ],
      ['fog', fade([0, 0], [3300, 0], [3500, 0.4], [3700, 0.75])],
      ['dome', fade([0, 0], [3600, 0], [3800, 1])],
      ['dome-ring', fade([0, 0], [3600, 0], [3800, 0.6])],
      ['watch', fade([0, 0], [3300, 0], [3301, 1], [4300, 1], [4301, 0])],
      [
        'data',
        [[0, at(POS.data)], [3900, at(POS.data)], ...fly(POS.data, POS.screen, 3900, 4500, 10, 5)],
      ],
      ['data', fade([0, 0], [3900, 0], [3901, 1], [4500, 1], [4501, 0])],
      ['screen', fade([0, 0], [4500, 0], [4501, 0.8], [4700, 0], [4800, 0.8], [5000, 0])],
      ['bubble', fade([0, 0], [5000, 0], [5001, 1], [5900, 1], [5901, 0])],
      ['tick', fade([0, 0], [6000, 0], [6001, 1])],
      ['zero', fade([0, 0], [6800, 0], [6801, 1])],
      ['wire', fade([0, 0], [7100, 0], [7101, 1])],
      ['question', fade([0, 0], [7400, 0], [7401, 1])],
    ],
    [
      [0, 3300],
      [3400, 6600],
      [6700, 9900],
    ],
  );
}

export const localPlaces = [
  { x: 80, key: 'device' },
  { x: 190, key: 'route' },
  { x: 340, key: 'cloud' },
];
