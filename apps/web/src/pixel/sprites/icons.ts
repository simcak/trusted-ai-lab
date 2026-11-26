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
