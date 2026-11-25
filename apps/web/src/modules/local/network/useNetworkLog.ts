import { useEffect, useState, useSyncExternalStore } from 'react';
import { createNetworkMonitor } from './network-monitor.ts';

/** One monitor per page visit; the observer is buffered, so it also sees the page's own load. */
export function useNetworkLog() {
  const [monitor] = useState(() => createNetworkMonitor());
  useEffect(() => monitor.start(), [monitor]);
  const snapshot = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot);
  return { monitor, snapshot };
}
