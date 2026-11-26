import { canvas } from '../canvas.ts';
import { defineSprite, recolor } from '../pixel-art.ts';
import { P } from './base.ts';

/** Site logo: a shield with a keyhole, 16×16. */
export const shield = defineSprite({
  palette: P,
  frames: [
    [
      '..oooooooooooo..',
      '.odddccccccccbo.',
      'oddccccccccccbao',
      'odwcccccccccbbao',
      'odcccckkkkccbbao',
      'odcccckkkkccbbao',
      'odccccckkccccbao',
      'odccccckkccccbao',
      '.odcccckkcccbao.',
      '.odccccccccccbo.',
      '..odccccccccbo..',
      '...odccccccbo...',
      '....odccccbo....',
      '.....odccbo.....',
      '......odbo......',
      '.......oo.......',
    ],
  ],
});

/** The same shield in leaf green: the guard / rules layer. */
export const guardShield = recolor(shield, {
  d: 'px-leaf-3',
  c: 'px-leaf-2',
  b: 'px-leaf-1',
  a: 'px-leaf-0',
});

/** Padlock, 7×8. */
export const lock = defineSprite({
  palette: P,
  frames: [
    ['..ooo..', '.o...o.', '.o...o.', 'ooooooo', 'omlllio', 'ollkljo', 'ojjkjio', 'ooooooo'],
  ],
});

/** Question mark that bobs, 5×8 (two frames). */
const qmarkRows = ['.ooo.', 'o...o', '...o.', '..o..', '..o..', '.....', '..o..'];
export const questionMark = defineSprite({
  palette: { ...P, o: 'px-sun-1' },
  frames: [
    [...qmarkRows, '.....'],
    ['.....', ...qmarkRows],
  ],
});

/** Locked cartridge slot for "more projects coming", 32×24. */
export const cartridge = defineSprite({
  palette: P,
  frames: [
    canvas(32, 24)
      .box(8, 1, 16, 22, '3', 'o')
      .rect(9, 2, 14, 1, '4')
      .box(10, 4, 12, 11, '5', '2')
      .stamp(13, 6, ['.ooo.', 'o...o', '...o.', '..o..', '..o..', '.....', '..o..'], { o: '2' })
      .rect(11, 17, 2, 4, '2')
      .rect(14, 17, 2, 4, '2')
      .rect(17, 17, 2, 4, '2')
      .rect(20, 17, 2, 4, '2')
      .rows(),
  ],
});

/** Sun for the light theme, 13×13. */
export const sun = defineSprite({
  palette: P,
  frames: [
    canvas(13, 13)
      .rect(6, 0, 1, 2, 'j')
      .rect(6, 11, 1, 2, 'j')
      .rect(0, 6, 2, 1, 'j')
      .rect(11, 6, 2, 1, 'j')
      .px(2, 2, 'j')
      .px(10, 2, 'j')
      .px(2, 10, 'j')
      .px(10, 10, 'j')
      .disc(6, 6, 3, 'j')
      .disc(6, 6, 2, 'l')
      .px(5, 5, 'm')
      .px(5, 4, 'm')
      .px(4, 5, 'm')
      .rows(),
  ],
});

/** Crescent moon with a star for the dark theme, 13×13. */
export const moon = defineSprite({
  palette: P,
  frames: [
    canvas(13, 13)
      .disc(6, 7, 5, 'l')
      .disc(6, 7, 4, 'm')
      .disc(9, 5, 4, '.')
      .px(11, 1, 'm')
      .px(10, 2, 'm')
      .px(12, 2, 'm')
      .px(11, 3, 'm')
      .rows(),
  ],
});

/** Light bulb for tips and "good to know" hints, 9×11. */
export const bulb = defineSprite({
  palette: P,
  frames: [
    [
      '..ooooo..',
      '.omllllo.',
      'ommlllljo',
      'omllllljo',
      'olllllllo',
      '.ojllljo.',
      '..ojjjo..',
      '..o444o..',
      '..o333o..',
      '..o444o..',
      '...ooo...',
    ],
  ],
});

/** Pause and play marks for the scene overlay, 7×7, white on the overlay's ink. */
export const pauseMark = defineSprite({
  palette: P,
  frames: [['ww...ww', 'ww...ww', 'ww...ww', 'ww...ww', 'ww...ww', 'ww...ww', 'ww...ww']],
});

export const playMark = defineSprite({
  palette: P,
  frames: [['w......', 'www....', 'wwwww..', 'wwwwwww', 'wwwww..', 'www....', 'w......']],
});
