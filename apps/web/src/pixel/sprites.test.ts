import { describe, expect, it } from 'vitest';
import tokens from '../styles/tokens.css?raw';
import { PALETTE } from './palette.ts';
import { circlePath, compileSprite, validateSprite, type SpriteDef } from './pixel-art.ts';
import * as hero from './sprites/hero.ts';
import * as icons from './sprites/icons.ts';
import * as projects from './sprites/projects.ts';

const isSprite = (value: unknown): value is SpriteDef =>
  typeof value === 'object' && value !== null && 'frames' in value && 'palette' in value;

const sprites = Object.entries({ ...icons, ...projects, ...hero }).filter(
  (entry): entry is [string, SpriteDef] => isSprite(entry[1]),
);

describe('sprites', () => {
  it('finds the sprite library', () => {
    expect(sprites.length).toBeGreaterThan(10);
  });

  it.each(sprites)('%s has equal rows, equal frames and known colours', (_name, sprite) => {
    expect(validateSprite(sprite)).toEqual([]);
    for (const key of Object.values(sprite.palette)) expect(PALETTE).toContain(key);
  });

  it('every palette key is a custom property declared in tokens.css', () => {
    for (const key of PALETTE) expect(tokens, key).toContain(`--${key}:`);
  });
});

describe('compileSprite', () => {
  it('merges runs of one colour into one path', () => {
    const sprite = {
      palette: { a: 'px-sky-1', b: 'px-ink-0' },
      frames: [['aab.', '.aaa']],
    } as const;
    const { width, height, frames } = compileSprite(sprite);
    expect([width, height]).toEqual([4, 2]);
    expect(frames[0]).toEqual([
      { fill: 'px-sky-1', d: 'M0 0h2v1h-2zM1 1h3v1h-3z' },
      { fill: 'px-ink-0', d: 'M2 0h1v1h-1z' },
    ]);
  });

  it('reports rows of the wrong width', () => {
    expect(validateSprite({ palette: { a: 'px-ink-0' }, frames: [['aa', 'a']] })).toEqual([
      'frame 0 row 1: width 1, expected 2',
    ]);
  });
});

describe('circlePath', () => {
  it('draws a ring without gaps or NaN', () => {
    const d = circlePath(10, 10, 6, { ring: true });
    expect(d).not.toContain('NaN');
    expect(d.startsWith('M')).toBe(true);
  });
});
