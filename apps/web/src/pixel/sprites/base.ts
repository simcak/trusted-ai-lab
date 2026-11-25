import type { PaletteKey } from '../palette.ts';

/**
 * Shared character → colour map, so rows read the same in every sprite:
 * o/k ink · w white · 1–5 steel (dark → light) · a–d sky · e–h leaf · i j l m sun ·
 * n p q ember · r s t u berry · v x y skin · z Z wood · G H glow · W lit window (theme).
 */
export const P = {
  o: 'px-ink-1',
  k: 'px-ink-0',
  w: 'px-white',
  '1': 'px-steel-0',
  '2': 'px-steel-1',
  '3': 'px-steel-2',
  '4': 'px-steel-3',
  '5': 'px-steel-4',
  a: 'px-sky-0',
  b: 'px-sky-1',
  c: 'px-sky-2',
  d: 'px-sky-3',
  e: 'px-leaf-0',
  f: 'px-leaf-1',
  g: 'px-leaf-2',
  h: 'px-leaf-3',
  i: 'px-sun-0',
  j: 'px-sun-1',
  l: 'px-sun-2',
  m: 'px-sun-3',
  n: 'px-ember-0',
  p: 'px-ember-1',
  q: 'px-ember-2',
  r: 'px-berry-0',
  s: 'px-berry-1',
  t: 'px-berry-2',
  u: 'px-berry-3',
  v: 'px-skin-0',
  x: 'px-skin-1',
  y: 'px-skin-2',
  z: 'px-wood-0',
  Z: 'px-wood-1',
  G: 'px-glow-0',
  H: 'px-glow-1',
  W: 'scene-window',
} as const satisfies Record<string, PaletteKey>;
