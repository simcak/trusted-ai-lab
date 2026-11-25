/** A network request seen by a PerformanceObserver, in a form that can cross a MessagePort. */
export interface SerialisedResource {
  url: string;
  /** Wall-clock start, ms since epoch (comparable between the page and the worker). */
  start: number;
  /** Bytes over the network; 0 when unknown (cross-origin without Timing-Allow-Origin, cache). */
  transferBytes: number;
  initiator: string;
  source: 'page' | 'worker';
}

export function serialiseResource(
  e: PerformanceResourceTiming,
  source: SerialisedResource['source'],
): SerialisedResource {
  return {
    url: e.name,
    start: performance.timeOrigin + e.startTime,
    transferBytes: e.transferSize || 0,
    initiator: e.initiatorType,
    source,
  };
}
