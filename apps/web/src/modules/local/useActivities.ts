import type { TraceLog } from '@trusted-ai-lab/llm-core';
import { useCallback, useEffect, useState } from 'react';
import { cs } from '../../i18n/cs.ts';
import { parseActivityFile } from './activity/parse.ts';
import { ActivityParseError, type ParsedActivity } from './activity/types.ts';
import type { NetworkMonitor } from './network/network-monitor.ts';
import { preloadSamples, readSample, SAMPLES, type SampleId } from './samples.ts';

export interface LoadedActivity {
  key: string;
  label: string;
  fileName: string;
  fileBytes: number;
  parsed: ParsedActivity;
  sample: SampleId | undefined;
}

interface Source {
  key: string;
  label: string | undefined;
  fileName: string;
  sample: SampleId | undefined;
  read: () => Promise<ArrayBuffer>;
}

/** Loaded activities; parsing happens here in the browser, the file never leaves it. */
export function useActivities(network: NetworkMonitor, log: TraceLog) {
  const [activities, setActivities] = useState<LoadedActivity[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | undefined>();
  const [errors, setErrors] = useState<string[]>([]);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    void preloadSamples();
  }, []);

  const add = useCallback(
    async (sources: Source[]) => {
      // The moment of choice starts the "after the file was chosen" phase on the network panel.
      network.markFileSelected();
      setReading(true);
      const loaded: LoadedActivity[] = [];
      const failed: string[] = [];
      for (const source of sources) {
        try {
          const buffer = await source.read();
          const parsed = await parseActivityFile(buffer);
          loaded.push({
            key: source.key,
            label: source.label ?? parsed.name ?? cs.local.pick.untitled,
            fileName: source.fileName,
            fileBytes: buffer.byteLength,
            parsed,
            sample: source.sample,
          });
          log.emit({
            type: 'info',
            name: 'file_parsed',
            output: {
              format: parsed.format,
              points: parsed.points.length,
              droppedMetadata: parsed.droppedMetadata,
            },
          });
        } catch (err) {
          const code = err instanceof ActivityParseError ? err.code : 'invalid_file';
          failed.push(cs.local.pick.errorFor(source.fileName, cs.local.pick.errors[code]));
        }
      }
      setErrors(failed);
      setReading(false);
      if (!loaded.length) return;
      setActivities((prev) => [
        ...prev.filter((a) => !loaded.some((l) => l.key === a.key)),
        ...loaded,
      ]);
      setSelectedKey(loaded[0]!.key);
    },
    [network, log],
  );

  const addSamples = useCallback(
    (ids: SampleId[]) =>
      add(
        ids.map((id) => {
          const sample = SAMPLES.find((s) => s.id === id)!;
          return {
            key: `sample:${id}`,
            label: cs.local.pick.samples[id].title,
            fileName: sample.file,
            sample: id,
            read: () => readSample(id),
          };
        }),
      ),
    [add],
  );

  const addFiles = useCallback(
    (files: File[]) =>
      add(
        files.map((file) => ({
          key: `file:${file.name}:${file.size}:${file.lastModified}`,
          label: undefined,
          fileName: file.name,
          sample: undefined,
          read: () => file.arrayBuffer(),
        })),
      ),
    [add],
  );

  const remove = useCallback((key: string) => {
    setActivities((prev) => prev.filter((a) => a.key !== key));
    // A removed selection falls back to the first remaining activity.
    setSelectedKey((current) => (current === key ? undefined : current));
  }, []);

  const selected = activities.find((a) => a.key === selectedKey) ?? activities[0];
  return {
    activities,
    selected,
    errors,
    reading,
    addSamples,
    addFiles,
    remove,
    select: setSelectedKey,
  };
}
