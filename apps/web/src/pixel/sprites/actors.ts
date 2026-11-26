import { defineSprite, recolor } from '../pixel-art.ts';
import { P } from './base.ts';

/*
 * Small icons (about 11 × 11) for the project machines: who acts in an agent run, what a
 * recommended pattern is, what leaves the device. Drawn on the shared palette, so they follow
 * the theme like every other sprite.
 */

/** A person: the user, the client. Shirt in sky, `d` is the shirt's middle line. */
export const person = defineSprite({
  palette: P,
  frames: [
    [
      '...ooooo...',
      '..ozzzzzo..',
      '..ozyyyzo..',
      '..oykykyo..',
      '..oyyyyyo..',
      '...oyxyo...',
      '..oobdboo..',
      '.obbbdbbbo.',
      'obbcbdbcbbo',
      'obbcbbbcbbo',
      'obbcbbbcbbo',
      'ooooooooooo',
    ],
  ],
});

/** The advisor: same person in a dark suit with a red tie. */
export const advisor = recolor(person, {
  b: 'px-steel-1',
  c: 'px-steel-0',
  d: 'px-berry-1',
  z: 'px-ink-0',
});

/** A small robot head: the model. */
export const robot = defineSprite({
  palette: P,
  frames: [
    [
      '.....j.....',
      '.....o.....',
      '.ooooooooo.',
      'o444444444o',
      'o4bb444bb4o',
      'o4bb444bb4o',
      'o444444444o',
      'o44kkkkk44o',
      'o444444444o',
      '.ooooooooo.',
    ],
  ],
});

/** Magnifying glass: search. */
export const magnifier = defineSprite({
  palette: P,
  frames: [
    [
      '..ooooo....',
      '.odddddo...',
      'odwddddco..',
      'odwddddco..',
      'odddddcco..',
      'odddddcco..',
      '.occcccoo..',
      '..ooooozZ..',
      '........zZ.',
      '.........zZ',
    ],
  ],
});

/** Pocket calculator: an exact calculation, no AI. */
export const calculator = defineSprite({
  palette: P,
  frames: [
    [
      'ooooooooo',
      'o3333333o',
      'o3hhhhh3o',
      'o3hhfhf3o',
      'o3333333o',
      'o3w3w3w3o',
      'o3333333o',
      'o3w3w3l3o',
      'o3333333o',
      'o3w3w3l3o',
      'ooooooooo',
    ],
  ],
});

/** Gear: ordinary software. */
export const gear = defineSprite({
  palette: P,
  frames: [
    [
      '....ooo....',
      '.oo.o4o.oo.',
      '.o4oo4oo4o.',
      '..o44444o..',
      'ooo4ooo4ooo',
      'o444o.o444o',
      'ooo4ooo4ooo',
      '..o44444o..',
      '.o4oo4oo4o.',
      '.oo.o4o.oo.',
      '....ooo....',
    ],
  ],
});

/** Rising bars: classic machine learning. */
export const chart = defineSprite({
  palette: P,
  frames: [
    [
      'o..........',
      'o.......gg.',
      'o.......gg.',
      'o....bb.gg.',
      'o....bb.gg.',
      'o.ll.bb.gg.',
      'o.ll.bb.gg.',
      'o.ll.bb.gg.',
      'ooooooooooo',
    ],
  ],
});

/** Speech bubble: one call to a language model. */
export const speech = defineSprite({
  palette: P,
  frames: [
    [
      '.ooooooooo.',
      'ouuuuuuuuuo',
      'ouuuuuuuuuo',
      'ouusususuuo',
      'ouuuuuuuuuo',
      '.ouooooooo.',
      '.oo........',
      '.o.........',
    ],
  ],
});

/** Open book: answers from documents (RAG). */
export const book = defineSprite({
  palette: P,
  frames: [
    [
      '.oooo.oooo.',
      'owwwwowwwwo',
      'ow333o333wo',
      'owwwwowwwwo',
      'ow333o333wo',
      'owwwwowwwwo',
      'obbbbobbbbo',
      '.ooooooooo.',
    ],
  ],
});

/** Stop sign: a prohibited practice. */
export const stopSign = defineSprite({
  palette: P,
  frames: [
    [
      '...ooooo...',
      '..opppppo..',
      '.opppppppo.',
      'opppppppppo',
      'opwwwwwwwpo',
      'opwwwwwwwpo',
      'opppppppppo',
      '.opppppppo.',
      '..opppppo..',
      '...ooooo...',
    ],
  ],
});

/** Antenna with waves: what goes out over the network. */
export const antenna = defineSprite({
  palette: P,
  frames: [
    [
      '.c.......c.',
      'c..c...c..c',
      'c.c..o..c.c',
      'c.c.ooo.c.c',
      'c..c.o.c..c',
      '.c...o...c.',
      '.....o.....',
      '....ooo....',
      '...o.o.o...',
      '..o..o..o..',
    ],
  ],
});

/** Sports watch with a green display. */
export const watch = defineSprite({
  palette: P,
  frames: [
    [
      '..ooooo..',
      '..o222o..',
      '.ooooooo.',
      'o3kkkkk3o',
      'o3kgkgk3o',
      'o3kgggk3o',
      'o3kkkkk3o',
      '.ooooooo.',
      '..o222o..',
      '..ooooo..',
    ],
  ],
});

/** A key: your own API key. */
export const key = defineSprite({
  palette: P,
  frames: [
    ['.ooo.......', 'olllo......', 'ol.looooooo', 'ol.ljjjjjjo', 'olllooojojo', '.ooo...o.o.'],
  ],
});
