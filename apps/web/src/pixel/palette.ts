/**
 * Palette keys are the names of CSS custom properties (without `--`) declared in
 * styles/tokens.css. `px-*` colours are fixed; `scene-*` colours switch between day (light
 * theme) and night (dark theme), so a sprite follows the theme without re-rendering.
 */
export const PALETTE = [
  'px-ink-0',
  'px-ink-1',
  'px-steel-0',
  'px-steel-1',
  'px-steel-2',
  'px-steel-3',
  'px-steel-4',
  'px-white',
  'px-sky-0',
  'px-sky-1',
  'px-sky-2',
  'px-sky-3',
  'px-leaf-0',
  'px-leaf-1',
  'px-leaf-2',
  'px-leaf-3',
  'px-sun-0',
  'px-sun-1',
  'px-sun-2',
  'px-sun-3',
  'px-ember-0',
  'px-ember-1',
  'px-ember-2',
  'px-berry-0',
  'px-berry-1',
  'px-berry-2',
  'px-berry-3',
  'px-skin-0',
  'px-skin-1',
  'px-skin-2',
  'px-wood-0',
  'px-wood-1',
  'px-glow-0',
  'px-glow-1',
  'scene-sky-0',
  'scene-sky-1',
  'scene-sky-2',
  'scene-sky-3',
  'scene-orb',
  'scene-orb-halo',
  'scene-cloud',
  'scene-cloud-shade',
  'scene-star',
  'scene-hill-far',
  'scene-hill-mid',
  'scene-hill-near',
  'scene-ground',
  'scene-ground-dark',
  'scene-path',
  'scene-path-dark',
  'scene-window',
] as const;

export type PaletteKey = (typeof PALETTE)[number];

/** CSS value for a palette key, e.g. `var(--px-sky-1)`. */
export const paint = (key: PaletteKey): string => `var(--${key})`;
