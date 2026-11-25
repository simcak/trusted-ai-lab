/**
 * A tiny pixel canvas for drawing sprites in code: geometric parts as rectangles and discs,
 * details as hand-drawn stamps. `rows()` returns the frame in the `SpriteDef` row format.
 */
export interface PixelCanvas {
  px(x: number, y: number, ch: string): PixelCanvas;
  rect(x: number, y: number, w: number, h: number, ch: string): PixelCanvas;
  /** Filled box with a one-pixel outline and notched (empty) corners. */
  box(x: number, y: number, w: number, h: number, fill: string, edge: string): PixelCanvas;
  disc(cx: number, cy: number, r: number, ch: string): PixelCanvas;
  /** Hand-drawn piece; `.` is transparent, `map` renames characters (recolouring). */
  stamp(x: number, y: number, rows: readonly string[], map?: Record<string, string>): PixelCanvas;
  rows(): string[];
}

export function canvas(width: number, height: number): PixelCanvas {
  const grid = Array.from({ length: height }, () => Array<string>(width).fill('.'));
  const set = (x: number, y: number, ch: string) => {
    if (x >= 0 && y >= 0 && x < width && y < height) grid[y]![x] = ch;
  };
  const api: PixelCanvas = {
    px(x, y, ch) {
      set(x, y, ch);
      return api;
    },
    rect(x, y, w, h, ch) {
      for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) set(x + i, y + j, ch);
      return api;
    },
    box(x, y, w, h, fill, edge) {
      api.rect(x + 1, y + 1, w - 2, h - 2, fill);
      api.rect(x + 1, y, w - 2, 1, edge).rect(x + 1, y + h - 1, w - 2, 1, edge);
      api.rect(x, y + 1, 1, h - 2, edge).rect(x + w - 1, y + 1, 1, h - 2, edge);
      return api;
    },
    disc(cx, cy, r, ch) {
      for (let dy = -r; dy <= r; dy += 1) {
        const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.5);
        api.rect(cx - half, cy + dy, half * 2 + 1, 1, ch);
      }
      return api;
    },
    stamp(x, y, rows, map) {
      rows.forEach((row, j) => {
        [...row].forEach((ch, i) => {
          if (ch !== '.') set(x + i, y + j, map?.[ch] ?? ch);
        });
      });
      return api;
    },
    rows: () => grid.map((row) => row.join('')),
  };
  return api;
}
