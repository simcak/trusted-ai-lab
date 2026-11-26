import { canvas } from '../canvas.ts';
import { defineSprite } from '../pixel-art.ts';
import { P } from './base.ts';
import { lock } from './icons.ts';

/* Gallery thumbnails, 32×24 each, two frames that play on hover. */

const QMARK = ['.###.', '#...#', '...#.', '..#..', '..#..', '.....', '..#..'];

/** Intake: a signpost — which way, AI or not? */
function signpost(bob: number) {
  return canvas(32, 24)
    .rect(4, 22, 24, 2, 'f')
    .rect(6, 22, 20, 1, 'g')
    .rect(14, 5, 3, 1, 'z')
    .rect(14, 6, 3, 17, 'Z')
    .rect(16, 6, 1, 17, 'z')
    .box(4, 7, 11, 6, 'l', 'o')
    .stamp(1, 7, ['..o', '.ol', 'oll', 'oll', '.ol', '..o'])
    .rect(4, 8, 1, 4, 'l')
    .rect(5, 8, 9, 1, 'm')
    .rect(5, 11, 9, 1, 'j')
    .rect(6, 9, 7, 1, 'i')
    .box(17, 13, 11, 6, 'c', 'o')
    .stamp(28, 13, ['o..', 'co.', 'cco', 'cco', 'co.', 'o..'])
    .rect(27, 14, 1, 4, 'c')
    .rect(18, 14, 9, 1, 'd')
    .rect(18, 17, 9, 1, 'b')
    .rect(19, 15, 7, 1, 'a')
    .stamp(21, bob, QMARK, { '#': 'j' })
    .rows();
}

export const intakeThumb = defineSprite({ palette: P, frames: [signpost(0), signpost(1)] });

/** Ochrana dat: an ID card whose number gets blacked out and face masked. */
const FACE = ['.zzzz.', 'zzyyzz', 'yyyyyy', 'yoyyoy', 'yyyyyy', '.yxxy.', 'bbbbbb'];

function idCard(masked: boolean) {
  const c = canvas(32, 24)
    .rect(4, 6, 27, 16, '2')
    .box(2, 4, 28, 17, '5', 'o')
    .rect(3, 5, 26, 2, 't')
    .rect(3, 7, 26, 1, 's')
    .rect(4, 5, 3, 1, 'u')
    .box(4, 9, 9, 10, '4', '3')
    .stamp(5, 10, FACE)
    .rect(15, 10, 12, 1, '3')
    .rect(15, 12, 8, 1, '3');
  if (masked) {
    c.rect(14, 14, 14, 5, 'k').rect(15, 15, 12, 1, 'r');
    c.stamp(5, 12, ['tsssst', 'skssks']);
    c.px(28, 2, 'w').px(29, 1, 'w').px(27, 1, 'u');
  } else {
    c.stamp(15, 15, ['11.1.111.11.', '.1.1...1..1.', '11.1.111.11.'], { '1': '2' });
  }
  return c.rows();
}

export const piiThumb = defineSprite({ palette: P, frames: [idCard(false), idCard(true)] });

/** Agent: a robot behind a guard shield. */
const SMALL_SHIELD = [
  '.oooooooo.',
  'ohhggggffo',
  'ohggggggfo',
  'ohggwgggfo',
  'ohggggggfo',
  'ohgggggffo',
  '.ohggggfo.',
  '.ohggggfo.',
  '..ohggfo..',
  '...ohfo...',
  '....oo....',
];

function robot(blink: boolean) {
  const c = canvas(32, 24)
    .rect(13, 0, 2, 1, blink ? 'q' : 'p')
    .rect(13, 1, 2, 3, '2')
    .rect(3, 8, 2, 5, '2')
    .rect(23, 8, 2, 5, '2')
    .box(5, 4, 18, 13, 'c', 'o')
    .rect(6, 5, 16, 1, 'd')
    .rect(6, 15, 16, 1, 'b')
    .box(8, 7, 12, 6, 'a', 'o')
    .box(8, 17, 12, 7, 'b', 'o')
    .rect(9, 18, 10, 1, 'c');
  if (blink) c.rect(10, 10, 2, 1, 'H').rect(16, 10, 2, 1, 'H');
  else c.rect(10, 9, 2, 2, 'H').rect(16, 9, 2, 2, 'H');
  return c.stamp(20, 11, SMALL_SHIELD).rows();
}

export const agentThumb = defineSprite({ palette: P, frames: [robot(false), robot(true)] });

/** Lokálně: a laptop with a heart-rate line and a padlock — data stays on the device. */
const HEART = ['pp.pp', 'ppppp', '.ppp.', '..p..'];

function laptop(spike: number) {
  const c = canvas(32, 24)
    .box(5, 2, 22, 15, '1', 'o')
    .rect(7, 4, 18, 11, 'a')
    .px(8, 5, 'b')
    .stamp(9, 5, HEART)
    .box(2, 17, 28, 4, '3', 'o')
    .rect(3, 18, 26, 1, '4')
    .rect(3, 21, 26, 1, '2');
  const line = (x: number) => {
    const d = x - spike;
    return d === 1 ? 8 : d === 2 ? 6 : d === 3 ? 13 : d === 4 ? 11 : 10;
  };
  let prev = line(8);
  for (let x = 8; x <= 23; x += 1) {
    const y = line(x);
    c.rect(x, Math.min(prev, y), 1, Math.abs(prev - y) + 1, 'g');
    prev = y;
  }
  return c.stamp(23, 10, lock.frames[0]).rows();
}

export const localThumb = defineSprite({ palette: P, frames: [laptop(10), laptop(15)] });
