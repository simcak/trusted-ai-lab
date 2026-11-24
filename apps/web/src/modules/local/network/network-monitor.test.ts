import { describe, expect, it } from 'vitest';
import { createNetworkMonitor } from './network-monitor.ts';
import type { SerialisedResource } from './resource.ts';

function entry(
  url: string,
  start: number,
  source: SerialisedResource['source'] = 'page',
): SerialisedResource {
  return { url, start, transferBytes: 100, initiator: 'fetch', source };
}

function setup() {
  let clock = 0;
  const monitor = createNetworkMonitor({ now: () => clock, origin: 'example.github.io' });
  return { monitor, at: (t: number) => (clock = t) };
}

describe('createNetworkMonitor', () => {
  it('sorts requests into page load, model download and after the file was chosen', () => {
    const { monitor, at } = setup();
    monitor.add([entry('https://example.github.io/assets/index.js', 1)]);
    at(10);
    monitor.markFileSelected();
    at(20);
    const done = monitor.beginModelDownload();
    monitor.add([
      entry('https://example.github.io/assets/web-llm.js', 21),
      entry('https://huggingface.co/mlc-ai/x/resolve/abc/tensor-cache.json', 22, 'worker'),
      entry('https://cas-bridge.xethub.hf.co/shard', 23, 'worker'),
      entry('https://raw.githubusercontent.com/mlc-ai/lib.wasm', 24, 'worker'),
    ]);
    at(30);
    done();

    const { counts, modelTransferBytes } = monitor.getSnapshot();
    expect(counts).toEqual({ page: 1, model: 4, afterFile: 0 });
    expect(modelTransferBytes).toBe(400);
  });

  it('counts any other request after the file was chosen, even during the download', () => {
    const { monitor, at } = setup();
    at(10);
    monitor.markFileSelected();
    const done = monitor.beginModelDownload();
    monitor.add([entry('https://tracker.example.com/beacon', 11)]);
    done();
    monitor.add([entry('https://example.github.io/late.js', 50)]);
    const { counts, entries } = monitor.getSnapshot();
    expect(counts.afterFile).toBe(2);
    expect(entries.map((e) => e.host)).toEqual(['tracker.example.com', 'example.github.io']);
  });

  it('ignores the same entry reported twice and notifies subscribers', () => {
    const { monitor } = setup();
    let calls = 0;
    monitor.subscribe(() => calls++);
    const e = entry('https://example.github.io/a.js', 1);
    monitor.add([e]);
    monitor.add([e]);
    expect(monitor.getSnapshot().entries).toHaveLength(1);
    expect(calls).toBe(1);
  });

  it('keeps the first moment a file was chosen', () => {
    const { monitor, at } = setup();
    at(5);
    monitor.markFileSelected();
    at(9);
    monitor.markFileSelected();
    expect(monitor.getSnapshot().fileSelectedAt).toBe(5);
  });
});
