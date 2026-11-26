import type { ComponentType } from 'react';
import type { SceneTimeline } from '../../../pixel/scene.ts';
import type { ModuleId } from '../../../modules/registry.ts';

/** One landing scene: its world, where its labels go and how it moves. */
export interface SceneDef {
  id: ModuleId;
  /** Memoised SVG world; its moving parts carry `data-part`. Its own DOM is the still frame. */
  World: ComponentType;
  /** Labels under the props, x in art pixels (0–400). */
  places: ReadonlyArray<{ x: number; key: string }>;
  /** Module-level (stable) builder of the timeline; captions are `caption-0…`. */
  timeline: (root: Element) => SceneTimeline;
}

/** A red pixel cross, `size` × `size`, two pixels thick. */
export function crossPath(x: number, y: number, size: number): string {
  let d = '';
  for (let i = 0; i < size - 1; i += 1) {
    d += `M${x + i} ${y + i}h2v1h-2z`;
    d += `M${x + size - 2 - i} ${y + i}h2v1h-2z`;
  }
  return d;
}

/** A pixel zero, 3 × 5. */
export const zeroPath = (x: number, y: number) =>
  `M${x} ${y}h3v1h-3zM${x} ${y + 4}h3v1h-3zM${x} ${y + 1}h1v3h-1zM${x + 2} ${y + 1}h1v3h-1z`;
