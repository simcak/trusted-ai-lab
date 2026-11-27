import { at, fade, fly, timeline, walk, type Point } from '../../../pixel/scenes/kit.ts';

/**
 * Agent: a robot walks between its tools (funds archive, calculator, mailbox). A gremlin jumps
 * out of the archive and the rules' shield bounces it off; the e-mail waits for a person's tick.
 */
export const POS = {
  start: [22, 132],
  atArchive: [80, 132],
  atCalc: [170, 132],
  atMail: [258, 132],
  cabinet: [100, 128],
  calc: [190, 128],
  mailbox: [282, 126],
  approver: [318, 136],
  inArchive: [101, 128],
  gremlinHit: [150, 124],
  gremlinBack: [112, 116],
  shield: [150, 122],
  spark: [149, 124],
  question: [320, 124],
  tick: [329, 114],
  carried: [258, 120],
  handed: [312, 124],
} as const satisfies Record<string, Point>;

/** The rules' shield floats at the robot's shoulder wherever it goes. */
export const GUARD: Point = [-16, -16];
export const shifted = ([x, y]: Point, [dx, dy]: Point = [0, 0]): Point => [x + dx, y + dy];

/** The robot's walk (or the shield's, with an offset). */
function robotKeys(offset?: Point) {
  const p = (q: Point) => shifted(q, offset);
  return [
    [0, at(p(POS.start))],
    [300, at(p(POS.start))],
    ...walk(p(POS.start), p(POS.atArchive), 300, 1500, 4),
    [2300, at(p(POS.atArchive))],
    ...walk(p(POS.atArchive), p(POS.atCalc), 2300, 3500, 4),
    [6200, at(p(POS.atCalc))],
    ...walk(p(POS.atCalc), p(POS.atMail), 6200, 7400, 4),
  ] as const;
}

export const DURATION = 11_000;

export function agentTimeline(root: Element) {
  return timeline(
    root,
    DURATION,
    [
      ['robot', [...robotKeys()]],
      ['guard', [...robotKeys(GUARD)]],
      ['search', fade([0, 0], [1600, 0], [1601, 0.8], [1800, 0], [1900, 0.8], [2100, 0])],
      ['compute', fade([0, 0], [3600, 0], [3601, 0.8], [3800, 0], [3900, 0.8], [4200, 0])],
      [
        'gremlin',
        [
          [0, at(POS.inArchive)],
          [4500, at(POS.inArchive)],
          ...fly(POS.inArchive, POS.gremlinHit, 4500, 5200, 16, 6),
          ...fly(POS.gremlinHit, POS.gremlinBack, 5250, 5800, 10, 4),
        ],
      ],
      ['gremlin', fade([0, 0], [4500, 0], [4501, 1], [5800, 1], [6000, 0])],
      ['shield', fade([0, 0], [5150, 0], [5151, 0.95], [5600, 0.95], [5700, 0])],
      ['spark', fade([0, 0], [5200, 0], [5201, 1], [5550, 1], [5551, 0])],
      [
        'letter',
        [
          [0, at([POS.atCalc[0], POS.carried[1]])],
          [6200, at([POS.atCalc[0], POS.carried[1]])],
          ...walk([POS.atCalc[0], POS.carried[1]], POS.carried, 6200, 7400, 4),
          [8500, at(POS.carried)],
          ...fly(POS.carried, POS.handed, 8500, 9200, 8, 5),
        ],
      ],
      ['letter', fade([0, 0], [4300, 0], [4301, 1])],
      ['question', fade([0, 0], [7500, 0], [7501, 1], [8300, 1], [8301, 0])],
      ['tick', fade([0, 0], [8400, 0], [8401, 1])],
    ],
    [
      [0, 4400],
      [4500, 7400],
      [7500, 10800],
    ],
  );
}

export const agentPlaces = [
  { x: 108, key: 'archive' },
  { x: 198, key: 'calc' },
  { x: 289, key: 'mail' },
  { x: 340, key: 'human' },
];
