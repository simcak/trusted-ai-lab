import { canvas } from '../canvas.ts';
import { defineSprite, recolor } from '../pixel-art.ts';
import { P } from './base.ts';
import { shield } from './icons.ts';

/* Props of the landing-page scene. */

/** "Vaše zařízení": a house with a lit window (window colour follows day/night). */
function houseRows() {
  const c = canvas(36, 30).box(25, 1, 5, 9, '2', 'o').rect(26, 2, 1, 6, '3');
  c.rect(15, 0, 6, 1, 'n');
  for (let r = 0; r < 12; r += 1) {
    const half = 3 + Math.floor(r * 1.25);
    c.rect(18 - half, r + 1, half * 2, 1, 'p');
    c.px(18 - half, r + 1, 'n').px(17 + half, r + 1, 'n');
    c.px(19 - half, r + 1, 'q');
  }
  return c
    .rect(1, 12, 34, 2, 'n')
    .box(4, 13, 28, 17, 'y', 'o')
    .rect(24, 14, 7, 15, 'x')
    .box(8, 19, 7, 11, 'Z', 'o')
    .rect(9, 20, 1, 9, 'z')
    .px(13, 24, 'l')
    .box(18, 17, 10, 8, 'W', 'o')
    .rect(22, 18, 1, 6, 'z')
    .rect(19, 20, 8, 1, 'z')
    .rows();
}

export const house = defineSprite({ palette: P, frames: [houseRows()] });

/** "Ochrana": a gate with the guard shield on top. */
function gateRows() {
  const c = canvas(34, 46);
  for (const x of [1, 26]) {
    c.box(x, 16, 7, 30, '3', 'o')
      .rect(x + 1, 17, 2, 28, '4')
      .rect(x + 5, 17, 1, 28, '2');
    c.box(x - 1, 42, 9, 4, '2', 'o');
  }
  return c
    .box(0, 12, 34, 6, '3', 'o')
    .rect(1, 13, 32, 1, '4')
    .rect(1, 16, 32, 1, '2')
    .stamp(9, 0, shield.frames[0], { d: 'h', c: 'g', b: 'f', a: 'e' })
    .rows();
}

export const gate = defineSprite({ palette: P, frames: [gateRows()] });

/** The gate's shield as a flash of light (same shape, one colour). */
export const shieldGlow = recolor(shield, {
  o: 'px-glow-1',
  d: 'px-white',
  c: 'px-glow-1',
  b: 'px-glow-1',
  a: 'px-glow-1',
  k: 'px-glow-1',
  w: 'px-white',
});

/** "AI model": a server rack with a friendly cloud head. */
function towerRows() {
  const c = canvas(40, 64).box(6, 24, 28, 40, '1', 'o');
  for (let y = 26; y + 6 <= 63; y += 6) {
    c.rect(7, y, 26, 1, '2')
      .rect(18, y + 2, 13, 1, 'k')
      .rect(18, y + 4, 13, 1, 'k');
  }
  c.rect(16, 21, 8, 3, '2');
  c.disc(13, 13, 9, 'o').disc(22, 10, 10, 'o').disc(30, 14, 8, 'o').rect(5, 14, 31, 9, 'o');
  c.disc(13, 13, 8, 's').disc(22, 10, 9, 's').disc(30, 14, 7, 's').rect(6, 14, 29, 8, 's');
  c.disc(13, 11, 6, 't').disc(22, 8, 7, 't').disc(30, 12, 5, 't');
  c.rect(6, 17, 29, 5, 's');
  c.disc(12, 8, 2, 'u').disc(20, 4, 2, 'u');
  return c
    .rect(14, 12, 4, 5, 'w')
    .rect(23, 12, 4, 5, 'w')
    .rect(16, 14, 2, 2, 'k')
    .rect(25, 14, 2, 2, 'k')
    .rect(17, 19, 7, 1, 'r')
    .rows();
}

export const tower = defineSprite({ palette: P, frames: [towerRows()] });

/** A letter (the user's message), 14×10. */
function envelopeRows() {
  const c = canvas(14, 10).box(0, 0, 14, 10, 'w', 'o').rect(1, 8, 12, 1, '5');
  for (let i = 0; i < 6; i += 1) c.px(1 + i, 1 + i, '4').px(12 - i, 1 + i, '4');
  return c.rows();
}

export const envelope = defineSprite({ palette: P, frames: [envelopeRows()] });

/** Badges pinned to a letter, 7×6: personal data, its pseudonym, and a reply. */
export const idBadge = defineSprite({
  palette: P,
  frames: [['.ooooo.', 'ozzaaao', 'oyyddao', 'oyyaaao', 'obbddao', '.ooooo.']],
});

export const maskBadge = defineSprite({
  palette: P,
  frames: [['.ooooo.', 'otttsso', 'okstkso', 'ossssso', '.ossso.', '..ooo..']],
});

export const replyBadge = defineSprite({
  palette: P,
  frames: [['.ooooo.', 'occccco', 'owcwcwo', 'occccco', '.oocoo.', '...o...']],
});

/** Prompt injection as a little gremlin, 13×13, two frames. */
function gremlinRows(open: boolean) {
  const c = canvas(13, 13)
    .disc(6, 7, 5, 'o')
    .disc(6, 7, 4, 'n')
    .disc(5, 6, 3, 'p')
    .px(4, 4, 'q')
    .stamp(1, 0, ['o.........o', 'oo.......oo', '.o.......o.'])
    .rect(3, 6, 2, 2, 'l')
    .rect(8, 6, 2, 2, 'l')
    .px(4, 7, 'k')
    .px(9, 7, 'k')
    .rect(4, 9, 5, open ? 2 : 1, 'k')
    .px(5, 9, 'w')
    .px(7, 9, 'w');
  if (open) c.px(3, 12, 'o').px(9, 12, 'o');
  else c.px(4, 12, 'o').px(8, 12, 'o');
  return c.rows();
}

export const gremlin = defineSprite({
  palette: P,
  frames: [gremlinRows(false), gremlinRows(true)],
});

export const spark = defineSprite({
  palette: P,
  frames: [
    [
      '....m....',
      '....l....',
      '....l....',
      '...lml...',
      'mllmwmllm',
      '...lml...',
      '....l....',
      '....l....',
      '....m....',
    ],
    [
      'm.......m',
      '.l.....l.',
      '..l...l..',
      '...lml...',
      '...mwm...',
      '...lml...',
      '..l...l..',
      '.l.....l.',
      'm.......m',
    ],
  ],
});

/** Health data, 9×8. */
export const heart = defineSprite({
  palette: P,
  frames: [
    [
      '.oo...oo.',
      'oqpo.oppo',
      'oqpppppno',
      'oppppppno',
      '.oppppno.',
      '..oppno..',
      '...opo...',
      '....o....',
    ],
  ],
});

/** "Thinking…" bubble, dots appear one by one. */
function bubbleRows(dots: number) {
  const c = canvas(15, 10).box(0, 0, 15, 8, 'w', 'o').rect(3, 7, 2, 1, 'w');
  c.px(3, 8, 'o').px(4, 8, 'o').px(2, 9, 'o').px(5, 7, 'o');
  for (let i = 0; i < dots; i += 1) c.rect(3 + i * 4, 3, 2, 2, '2');
  return c.rows();
}

export const thinking = defineSprite({
  palette: P,
  frames: [bubbleRows(1), bubbleRows(2), bubbleRows(3)],
});

export const cloud = defineSprite({
  palette: { C: 'scene-cloud', S: 'scene-cloud-shade' },
  frames: [
    canvas(28, 10)
      .disc(8, 6, 4, 'C')
      .disc(15, 4, 5, 'C')
      .disc(21, 6, 4, 'C')
      .rect(4, 6, 21, 4, 'C')
      .rect(5, 9, 19, 1, 'S')
      .rows(),
  ],
});
