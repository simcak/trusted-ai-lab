import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { playTimeline, type SceneTimeline } from './scene.ts';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReduced(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(REDUCED_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

const readReduced = () =>
  typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_QUERY).matches;

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, readReduced, () => false);
}

export type SceneStatus = 'playing' | 'paused' | 'static';

/**
 * Runs a scene timeline on the element in `rootRef`.
 * - Reduced motion: the DOM's own state is the still frame; "play" runs the scene once.
 * - Off-screen the scene pauses; the user can always pause it (WCAG 2.2.2).
 * `build` must be stable (a module-level function), it receives the root to query targets.
 */
export function useScene(
  rootRef: RefObject<Element | null>,
  build: (root: Element) => SceneTimeline,
): { status: SceneStatus; toggle: () => void } {
  const reduced = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const [onceRequest, setOnceRequest] = useState(0);
  const animations = useRef<Animation[]>([]);
  const pausedRef = useRef(paused);
  const visibleRef = useRef(true);

  const apply = () => {
    const run = !pausedRef.current && visibleRef.current;
    for (const a of animations.current) {
      if (run) a.play();
      else a.pause();
    }
  };

  const isStatic = reduced && onceRequest === 0;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || isStatic) return;
    const list = playTimeline(build(root), { iterations: reduced ? 1 : Infinity });
    animations.current = list;
    apply();
    if (reduced) {
      list[0]?.finished.then(
        () => setOnceRequest(0),
        () => {},
      );
    }
    return () => {
      for (const a of list) a.cancel();
      animations.current = [];
    };
  }, [rootRef, build, reduced, isStatic, onceRequest]);

  useEffect(() => {
    pausedRef.current = paused;
    apply();
  }, [paused]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry?.isIntersecting ?? true;
      apply();
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [rootRef]);

  const toggle = () => {
    if (isStatic) {
      setPaused(false);
      setOnceRequest((n) => n + 1);
    } else setPaused((p) => !p);
  };

  return { status: isStatic ? 'static' : paused ? 'paused' : 'playing', toggle };
}
