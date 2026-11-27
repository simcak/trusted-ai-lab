import { type PaletteKey } from '../../../pixel/palette.ts';
import { at, fade, timeline, walk, type Point } from '../../../pixel/scenes/kit.ts';

/**
 * Rozcestník: an idea walks up to a signpost. The AI board flashes and gets crossed out, the
 * "without AI" board lights up, and the idea walks on to a house where a calculator does the job.
 */
export const POS = {
  start: [24, 138],
  atPost: [158, 138],
  post: [170, 108],
  question: [161, 124],
  house: [262, 121],
  atDoor: [268, 138],
  window: [285, 141],
  calc: [280, 103],
  spark: [276, 99],
  tower: [326, 88],
  barrier: [214, 127],
  stop: [222, 115],
} as const satisfies Record<string, Point>;

/** The signpost's boards (art pixels): AI on top, without AI in the middle, prohibited below. */
export const BOARD = { ai: [183, 113], noAi: [183, 123], stop: [183, 133] } as const;

export const DURATION = 10_000;
export const LEDS = [116, 122, 128, 134, 140, 146];
export const LED_COLOURS: PaletteKey[] = ['px-leaf-2', 'px-sky-2', 'px-sun-2'];

export function intakeTimeline(root: Element) {
  return timeline(
    root,
    DURATION,
    [
      [
        'idea',
        [
          [0, at(POS.start)],
          [300, at(POS.start)],
          ...walk(POS.start, POS.atPost, 300, 2300, 6),
          [5200, at(POS.atPost)],
          ...walk(POS.atPost, POS.atDoor, 5200, 7000, 5),
        ],
      ],
      ['question', fade([0, 0], [2400, 0], [2401, 1], [4500, 1], [4501, 0])],
      ['glow-ai', fade([0, 0], [2800, 0], [2801, 0.8], [3000, 0], [3200, 0.8], [3400, 0])],
      ['cross-ai', fade([0, 0], [3500, 0], [3501, 1])],
      ['glow-noai', fade([0, 0], [4000, 0], [4001, 0.8], [4600, 0.5])],
      ['tick', fade([0, 0], [4200, 0], [4201, 1])],
      ['window-flare', fade([0, 0], [7000, 0], [7100, 0.9], [7700, 0])],
      ['calc', fade([0, 0], [7300, 0], [7301, 1])],
      ['spark', fade([0, 0], [7300, 0], [7301, 1], [7800, 1], [7801, 0])],
    ],
    [
      [0, 3300],
      [3400, 6800],
      [6900, 9900],
    ],
  );
}

export const intakePlaces = [
  { x: 228, key: 'stop' },
  { x: 184, key: 'post' },
  { x: 280, key: 'noAi' },
  { x: 346, key: 'ai' },
];
