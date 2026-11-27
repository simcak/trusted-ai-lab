import { at, fade, fly, timeline, walk, type Point } from '../../../pixel/scenes/kit.ts';
import { type PaletteKey } from '../../../pixel/palette.ts';

/** Ochrana dat: a letter leaves home, the gate masks the personal data, the reply comes back. */
export const POS = {
  house: [78, 121],
  gate: [183, 104],
  tower: [300, 88],
  door: [82, 140],
  atGate: [193, 140],
  mouth: [306, 104],
  bubble: [326, 70],
  window: [101, 141],
} as const satisfies Record<string, Point>;

export const DURATION = 11_500;
export const LEDS = [116, 122, 128, 134, 140, 146];
export const LED_COLOURS: PaletteKey[] = ['px-leaf-2', 'px-sky-2', 'px-sun-2'];

export function piiTimeline(root: Element) {
  const { door, atGate, mouth } = POS;
  return timeline(
    root,
    DURATION,
    [
      [
        'letter',
        [
          [0, at(door)],
          [800, at(door)],
          ...walk(door, atGate, 900, 3000, 5),
          [3800, at(atGate)],
          ...fly(atGate, mouth, 3900, 5500, 24),
        ],
      ],
      ['letter', fade([0, 0], [800, 0], [900, 1], [5500, 1], [5700, 0])],
      ['letter-id', fade([0, 1], [3400, 1], [3401, 0])],
      ['letter-mask', fade([0, 0], [3400, 0], [3401, 1])],
      [
        'beam',
        [
          [0, { opacity: 0, transform: 'translate(0px, 122px)' }],
          [3000, { opacity: 0, transform: 'translate(0px, 122px)' }],
          [3050, { opacity: 1, transform: 'translate(0px, 122px)' }],
          [3400, { opacity: 1, transform: 'translate(0px, 147px)' }],
          [3750, { opacity: 1, transform: 'translate(0px, 122px)' }],
          [3800, { opacity: 0, transform: 'translate(0px, 122px)' }],
        ],
      ],
      [
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
      ],
      ['bubble', fade([0, 0], [5500, 0], [5600, 1], [6500, 1], [6600, 0])],
      [
        'reply',
        [
          [0, at(mouth)],
          [6500, at(mouth)],
          ...fly(mouth, atGate, 6600, 8600, 18),
          [9200, at(atGate)],
          ...walk(atGate, door, 9200, 10800, 5),
        ],
      ],
      ['reply', fade([0, 0], [6500, 0], [6600, 1], [10800, 1], [11000, 0])],
      ['reply-mask', fade([0, 1], [9000, 1], [9001, 0])],
      ['reply-id', fade([0, 0], [9000, 0], [9001, 1])],
      ['window-flare', fade([0, 0], [10800, 0], [10900, 0.9], [11400, 0])],
    ],
    [
      [0, 3300],
      [3400, 6500],
      [6600, 11400],
    ],
  );
}

export const piiPlaces = [
  { x: 96, key: 'device' },
  { x: 200, key: 'guard' },
  { x: 320, key: 'model' },
];
