import { useLayoutEffect, type RefObject } from 'react';

/**
 * Sizes a pixel "world" (w × h art pixels) to cover its stage, anchored bottom-centre.
 * From 2× up the scale rounds up to a whole number (unless that crops more than 20 %), so
 * every art pixel is the same size on screen.
 * Writes the size straight to the element's style (no re-render).
 */
export function useStageScale(
  stageRef: RefObject<HTMLElement | null>,
  worldRef: RefObject<HTMLElement | null>,
  w: number,
  h: number,
): void {
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const world = worldRef.current;
    if (!stage || !world || typeof ResizeObserver !== 'function') return;
    const update = () => {
      const { width, height } = stage.getBoundingClientRect();
      if (!width || !height) return;
      const cover = Math.max(width / w, height / h);
      // Whole-number scale keeps pixels even; skip it when it would crop too much.
      const whole = Math.ceil(cover);
      const scale = cover >= 2 && whole / cover <= 1.2 ? whole : cover;
      const worldW = Math.round(w * scale);
      world.style.width = `${worldW}px`;
      world.style.height = `${Math.round(h * scale)}px`;
      world.style.left = `${Math.round((width - worldW) / 2)}px`;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [stageRef, worldRef, w, h]);
}
