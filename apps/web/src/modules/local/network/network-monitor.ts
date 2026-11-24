import { isModelHost } from '../coach/model.ts';
import { serialiseResource, type SerialisedResource } from './resource.ts';

export type NetworkPhase = 'page' | 'model' | 'afterFile';

export interface ClassifiedResource extends SerialisedResource {
  host: string;
  phase: NetworkPhase;
}

export interface NetworkSnapshot {
  entries: ClassifiedResource[];
  fileSelectedAt: number | undefined;
  counts: Record<NetworkPhase, number>;
  /** Known transfer size of the model download (0 for cross-origin entries without timing data). */
  modelTransferBytes: number;
}

/** Plain functions (not methods), shaped for `useSyncExternalStore` like `TraceLog`. */
export interface NetworkMonitor {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => NetworkSnapshot;
  add: (entries: readonly SerialisedResource[]) => void;
  /** From now on every request counts as "after the file was chosen". */
  markFileSelected: () => void;
  /** Opens a model-download window; call the returned function when the model is ready. */
  beginModelDownload: () => () => void;
  /** Starts the page's PerformanceObserver (buffered: also requests made before). */
  start: () => () => void;
}

interface Window {
  start: number;
  end: number | undefined;
}

/**
 * Collects resource timing entries of the page and of the model worker and sorts them into
 * three phases: loading the page, downloading the model (a separate step the visitor starts),
 * and everything after a file was chosen, which should stay at zero.
 */
export function createNetworkMonitor({
  now = Date.now,
  origin = typeof location === 'undefined' ? '' : location.host,
}: { now?: () => number; origin?: string } = {}): NetworkMonitor {
  const raw: SerialisedResource[] = [];
  const seen = new Set<string>();
  const windows: Window[] = [];
  const listeners = new Set<() => void>();
  let fileSelectedAt: number | undefined;
  let snapshot = compute();

  function hostOf(url: string): string {
    try {
      return new URL(url).host;
    } catch {
      return '';
    }
  }

  function phaseOf(e: SerialisedResource, host: string): NetworkPhase {
    const inWindow = windows.some((w) => e.start >= w.start && e.start <= (w.end ?? Infinity));
    // Only the download itself belongs to the model step: model hosts and this site's own chunks.
    if (inWindow && (isModelHost(host) || host === origin)) return 'model';
    if (fileSelectedAt !== undefined && e.start >= fileSelectedAt) return 'afterFile';
    return 'page';
  }

  function compute(): NetworkSnapshot {
    const entries = raw
      .map((e) => {
        const host = hostOf(e.url);
        return { ...e, host, phase: phaseOf(e, host) };
      })
      .sort((a, b) => a.start - b.start);
    const counts: Record<NetworkPhase, number> = { page: 0, model: 0, afterFile: 0 };
    let modelTransferBytes = 0;
    for (const e of entries) {
      counts[e.phase]++;
      if (e.phase === 'model') modelTransferBytes += e.transferBytes;
    }
    return { entries, fileSelectedAt, counts, modelTransferBytes };
  }

  function changed() {
    snapshot = compute();
    for (const l of listeners) l();
  }

  const monitor: NetworkMonitor = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    add(entries) {
      let added = false;
      for (const e of entries) {
        const key = `${e.source} ${e.start} ${e.url}`;
        if (seen.has(key)) continue;
        seen.add(key);
        raw.push(e);
        added = true;
      }
      if (added) changed();
    },
    markFileSelected() {
      if (fileSelectedAt !== undefined) return;
      fileSelectedAt = now();
      changed();
    },
    beginModelDownload() {
      const w: Window = { start: now(), end: undefined };
      windows.push(w);
      changed();
      return () => {
        w.end = now();
        changed();
      };
    },
    start() {
      if (typeof PerformanceObserver === 'undefined') return () => undefined;
      const observer = new PerformanceObserver((list) =>
        monitor.add(
          list.getEntries().map((e) => serialiseResource(e as PerformanceResourceTiming, 'page')),
        ),
      );
      observer.observe({ type: 'resource', buffered: true });
      return () => observer.disconnect();
    },
  };
  return monitor;
}
