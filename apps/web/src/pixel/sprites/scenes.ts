import { canvas } from '../canvas.ts';
import { defineSprite } from '../pixel-art.ts';
import { P } from './base.ts';

/* Props and characters of the four landing scenes (Rozcestník, Agent, Lokálně). */

/** A signpost with three boards: AI (sky), without AI (leaf), prohibited (ember). 28×42. */
function signpostRows() {
  const c = canvas(28, 42).rect(12, 2, 4, 40, 'Z').rect(12, 2, 1, 40, 'z').rect(11, 0, 6, 3, 'z');
  const board = (y: number, fill: string, light: string) => {
    c.box(13, y, 12, 7, fill, 'o')
      .stamp(
        25,
        y,
        ['o..', 'ko.', 'kko', 'kko', 'ko.', 'o..'].map((r) => r.replace(/k/g, fill)),
      )
      .rect(15, y + 2, 7, 1, light)
      .rect(15, y + 4, 5, 1, light);
  };
  board(5, 'c', 'd');
  board(15, 'g', 'h');
  board(25, 'q', 'w');
  return c.rows();
}

export const signpost = defineSprite({ palette: P, frames: [signpostRows()] });

/** A striped road barrier, 28×14. */
function barrierRows() {
  const c = canvas(28, 14)
    .rect(1, 4, 3, 10, '2')
    .rect(24, 4, 3, 10, '2')
    .box(0, 2, 28, 5, 'w', 'o');
  for (let x = 2; x < 26; x += 6) c.rect(x, 3, 3, 3, 'p');
  return c.rows();
}

export const barrier = defineSprite({ palette: P, frames: [barrierRows()] });

/** The agent: a small robot on two legs, 14×18, two walking frames. */
function walkerRows(step: boolean) {
  const c = canvas(14, 18)
    .px(7, 0, 'j')
    .rect(7, 1, 1, 1, 'o')
    .box(2, 2, 11, 7, '4', 'o')
    .rect(4, 4, 2, 2, 'b')
    .rect(9, 4, 2, 2, 'b')
    .rect(5, 7, 5, 1, 'k')
    .box(3, 9, 9, 6, '3', 'o')
    .px(7, 11, 'g')
    .rect(1, 10, 2, 1, 'o')
    .rect(12, 10, 2, 1, 'o');
  if (step) c.rect(4, 15, 2, 3, 'o').rect(9, 15, 2, 2, 'o');
  else c.rect(4, 15, 2, 2, 'o').rect(9, 15, 2, 3, 'o');
  return c.rows();
}

export const walker = defineSprite({ palette: P, frames: [walkerRows(false), walkerRows(true)] });

/** An archive cabinet: where the funds are, 16×22. */
function cabinetRows() {
  const c = canvas(16, 22).box(0, 0, 16, 22, '3', 'o');
  for (const y of [2, 9, 15]) c.box(2, y, 12, 6, '4', 'o').rect(6, y + 2, 4, 1, 'k');
  return c.rows();
}

export const cabinet = defineSprite({ palette: P, frames: [cabinetRows()] });

/** A big calculator: the fee tool, 16×22. */
function bigCalcRows() {
  const c = canvas(16, 22).box(0, 0, 16, 22, '2', 'o').box(2, 2, 12, 6, 'h', 'o');
  c.rect(8, 4, 1, 2, 'f').rect(10, 4, 1, 2, 'f').rect(12, 4, 1, 2, 'f');
  for (let row = 0; row < 3; row += 1)
    for (let col = 0; col < 3; col += 1)
      c.rect(3 + col * 4, 10 + row * 4, 2, 2, col === 2 ? 'l' : 'w');
  return c.rows();
}

export const bigCalc = defineSprite({ palette: P, frames: [bigCalcRows()] });

/** A mailbox on a post: the e-mail draft, 14×24. */
function mailboxRows() {
  return canvas(14, 24)
    .rect(6, 10, 2, 14, 'Z')
    .box(0, 1, 13, 10, 's', 'o')
    .rect(1, 2, 11, 2, 't')
    .rect(3, 5, 6, 1, 'r')
    .rect(12, 0, 2, 6, 'n')
    .rows();
}

export const mailbox = defineSprite({ palette: P, frames: [mailboxRows()] });

/** A person who approves: suit and tie, 10×14. */
export const approver = defineSprite({
  palette: P,
  frames: [
    [
      '..oooooo..',
      '.ozzzzzzo.',
      '.ozyyyyzo.',
      '.oykyykyo.',
      '.oyyyyyyo.',
      '..oyxxyo..',
      '..oo22oo..',
      '.o222s22o.',
      'o2222s222o',
      'o22222222o',
      '.o222222o.',
      '..o2oo2o..',
      '..o2oo2o..',
      '..kk..kk..',
    ],
  ],
});

/** A runner, 10×12, two frames: stride and passing. */
export const runner = defineSprite({
  palette: P,
  frames: [
    [
      '...oooo...',
      '..ozzzzo..',
      '..oyyyyo..',
      '..oykyko..',
      '...oyyo...',
      '.y.offo.y.',
      '.yoffffoy.',
      '...offfo..',
      '...obbbo..',
      '...oy.oy..',
      '..oy...oy.',
      '.nn.....nn',
    ],
    [
      '...oooo...',
      '..ozzzzo..',
      '..oyyyyo..',
      '..oykyko..',
      '...oyyo...',
      '...offo...',
      '..yffffy..',
      '...offfo..',
      '...obbbo..',
      '...oyyo...',
      '...oyyo...',
      '...nnnn...',
    ],
  ],
});

/** A green tick: approved, the simple way wins. 7×7. */
export const tick = defineSprite({
  palette: P,
  frames: [['......g', '.....gg', 'g...gg.', 'gg.gg..', '.ggg...', '..g....', '.......']],
});
