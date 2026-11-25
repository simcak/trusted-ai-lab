import type { PaletteKey } from './palette.ts';

/** Character for an empty (transparent) pixel. */
export const CLEAR = '.';

/**
 * A sprite drawn in code: each frame is a list of equally long rows, each character a pixel.
 * `palette` maps characters to palette keys, so the same rows can be recoloured.
 */
export interface SpriteDef {
  readonly palette: Readonly<Record<string, PaletteKey>>;
  readonly frames: readonly (readonly string[])[];
}

/** One colour of one frame as an SVG path (runs of pixels, one rectangle per run). */
export interface SpriteLayer {
  readonly fill: PaletteKey;
  readonly d: string;
}

export interface CompiledSprite {
  readonly width: number;
  readonly height: number;
  readonly frames: readonly (readonly SpriteLayer[])[];
}

export function defineSprite<const T extends SpriteDef>(def: T): T {
  return def;
}

/** Same rows, different colours. */
export function recolor(def: SpriteDef, palette: Readonly<Record<string, PaletteKey>>): SpriteDef {
  return { frames: def.frames, palette: { ...def.palette, ...palette } };
}

const cache = new WeakMap<SpriteDef, CompiledSprite>();

/** Compiles a sprite to one path per colour per frame. Cached per definition. */
export function compileSprite(def: SpriteDef): CompiledSprite {
  const cached = cache.get(def);
  if (cached) return cached;
  const first = def.frames[0] ?? [];
  const compiled: CompiledSprite = {
    width: first[0]?.length ?? 0,
    height: first.length,
    frames: def.frames.map((rows) => compileFrame(rows, def.palette)),
  };
  cache.set(def, compiled);
  return compiled;
}

function compileFrame(
  rows: readonly string[],
  palette: Readonly<Record<string, PaletteKey>>,
): SpriteLayer[] {
  const paths = new Map<PaletteKey, string>();
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x]!;
      let end = x + 1;
      while (end < row.length && row[end] === ch) end += 1;
      const fill = palette[ch];
      if (ch !== CLEAR && fill) paths.set(fill, (paths.get(fill) ?? '') + run(x, y, end - x));
      x = end;
    }
  });
  return [...paths].map(([fill, d]) => ({ fill, d }));
}

const run = (x: number, y: number, w: number, h = 1) => `M${x} ${y}h${w}v${h}h${-w}z`;

/** Problems with a sprite definition (empty when valid). Used by the sprite test. */
export function validateSprite(def: SpriteDef): string[] {
  const errors: string[] = [];
  const first = def.frames[0];
  if (!first || first.length === 0) return ['no frames'];
  const width = first[0]!.length;
  def.frames.forEach((rows, f) => {
    if (rows.length !== first.length)
      errors.push(`frame ${f}: ${rows.length} rows, expected ${first.length}`);
    rows.forEach((row, y) => {
      if (row.length !== width)
        errors.push(`frame ${f} row ${y}: width ${row.length}, expected ${width}`);
      for (const ch of row) {
        if (ch !== CLEAR && !(ch in def.palette))
          errors.push(`frame ${f} row ${y}: unknown "${ch}"`);
      }
    });
  });
  return errors;
}

/* Procedural shapes for scenes, in the same path format. */

/** Filled rectangle. */
export const rectPath = (x: number, y: number, w: number, h: number): string => run(x, y, w, h);

/**
 * Pixel circle as runs per row: filled, or a one-pixel ring with `ring`; `top` keeps only the
 * upper half (a dome).
 */
export function circlePath(
  cx: number,
  cy: number,
  r: number,
  opts: { ring?: boolean; top?: boolean } = {},
): string {
  let d = '';
  for (let dy = -r; dy <= (opts.top ? 0 : r); dy += 1) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.5);
    const innerSq = (r - 1) * (r - 1) - dy * dy;
    if (!opts.ring || innerSq < 0) {
      d += run(cx - half, cy + dy, half * 2 + 1);
      continue;
    }
    const w = Math.max(1, half - Math.floor(Math.sqrt(innerSq) + 0.5));
    d += run(cx - half, cy + dy, w);
    d += run(cx + half - w + 1, cy + dy, w);
  }
  return d;
}

/**
 * Hill silhouette: column heights from two sine waves, merged into runs of equal height,
 * filled down to `bottom`.
 */
export function hillPath(opts: {
  width: number;
  base: number;
  bottom: number;
  waves: ReadonlyArray<readonly [amplitude: number, period: number, phase: number]>;
}): string {
  const tops: number[] = [];
  for (let x = 0; x < opts.width; x += 1) {
    let y = opts.base;
    for (const [a, p, ph] of opts.waves) y -= a * Math.sin((x / p) * Math.PI * 2 + ph);
    tops.push(Math.round(y));
  }
  let d = '';
  let x = 0;
  while (x < tops.length) {
    let end = x + 1;
    while (end < tops.length && tops[end] === tops[x]) end += 1;
    d += run(x, tops[x]!, end - x, opts.bottom - tops[x]!);
    x = end;
  }
  return d;
}

/** Checkerboard dither in a band, `phase` 0 or 1 picks which pixels are set. */
export function ditherPath(x: number, y: number, w: number, h: number, phase = 0): string {
  let d = '';
  for (let j = 0; j < h; j += 1) {
    for (let i = (j + phase) % 2; i < w; i += 2) d += `M${x + i} ${y + j}h1v1h-1z`;
  }
  return d;
}
