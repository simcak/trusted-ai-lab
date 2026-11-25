import { haversineMeters } from '@trusted-ai-lab/pii-cz';
import { describe, expect, it } from 'vitest';
import { readSample, SAMPLES, type SampleId } from '../samples.ts';
import { distanceMeters, movingSeconds } from './metrics.ts';
import { detectFormat, parseActivityFile } from './parse.ts';
import { protect } from './privacy.ts';
import { ActivityParseError, type MetadataKind } from './types.ts';

const sample = (id: SampleId) => SAMPLES.find((s) => s.id === id)!;

const EXPECTED: Record<SampleId, { name: string | undefined; dropped: MetadataKind[] }> = {
  run: { name: 'Večerní běh', dropped: ['application', 'author'] },
  ride: {
    name: 'Vyjížďka na kole',
    dropped: ['device', 'serialNumber', 'softwareVersion', 'application'],
  },
  intervals: {
    name: undefined,
    dropped: ['manufacturer', 'device', 'serialNumber', 'softwareVersion'],
  },
};

describe.each(SAMPLES.map((s) => s.id))('sample %s', (id) => {
  const meta = sample(id);

  it('parses every sample the generator wrote, with heart rate and GPS', async () => {
    const activity = await parseActivityFile(await readSample(meta.id));
    expect(activity.format).toBe(meta.format);
    expect(activity.sport).toBe(meta.sport);
    expect(activity.points).toHaveLength(meta.samples);
    expect(activity.points[0]?.time).toBe(Date.parse(meta.startTime));
    expect(activity.points.at(-1)?.time).toBe(Date.parse(meta.startTime) + meta.durationS * 1000);
    expect(activity.points.every((p) => p.hr !== undefined && p.lat !== undefined)).toBe(true);
    expect(activity.name).toBe(EXPECTED[id].name);
    expect(activity.droppedMetadata).toEqual(EXPECTED[id].dropped);
  });

  it('measures a distance within 3 % of the noise-free route', async () => {
    // GPS noise adds a little, sampling every few seconds cuts curves a little.
    const distance = distanceMeters((await parseActivityFile(await readSample(meta.id))).points)!;
    expect(Math.abs(distance / meta.pathLengthM - 1)).toBeLessThan(0.03);
  });

  it('trims the start and end around the fictional home', async () => {
    const activity = await parseActivityFile(await readSample(meta.id));
    const home = activity.points[0] as { lat: number; lon: number };
    const end = activity.points.at(-1) as { lat: number; lon: number };
    const kept = protect(activity, 400);
    const first = kept.activity.points[0] as { lat: number; lon: number };
    const last = kept.activity.points.at(-1) as { lat: number; lon: number };
    expect(kept.removed.start.length).toBeGreaterThan(0);
    expect(kept.removed.end.length).toBeGreaterThan(0);
    expect(haversineMeters(home, first)).toBeGreaterThanOrEqual(400);
    expect(haversineMeters(end, last)).toBeGreaterThanOrEqual(400);
    expect(protect(activity, 0).activity.points).toHaveLength(activity.points.length);
  });
});

describe('the evening run', () => {
  it('does not count the 42 s stop as moving', async () => {
    const run = sample('run');
    const moving = movingSeconds((await parseActivityFile(await readSample(run.id))).points)!;
    expect(moving).toBeLessThanOrEqual(run.durationS - 36);
    expect(moving).toBeGreaterThan(run.durationS - 120);
  });
});

describe('parseActivityFile', () => {
  const bytes = (text: string) => new TextEncoder().encode(text).buffer;

  it('rejects files that are neither GPX, TCX nor FIT', async () => {
    await expect(parseActivityFile(bytes('lat,lon\n50,14'))).rejects.toMatchObject({
      code: 'unknown_format',
    });
  });

  it('rejects malformed XML', async () => {
    await expect(parseActivityFile(bytes('<gpx version="1.1"><trk>'))).rejects.toBeInstanceOf(
      ActivityParseError,
    );
  });

  it('needs at least two timed points', async () => {
    const gpx =
      '<gpx version="1.1"><trk><trkseg><trkpt lat="50" lon="14"><time>2026-11-16T10:00:00Z</time></trkpt></trkseg></trk></gpx>';
    await expect(parseActivityFile(bytes(gpx))).rejects.toMatchObject({ code: 'no_points' });
  });

  it('reads a GPX with a namespace prefix and no extensions', async () => {
    const gpx = `<?xml version="1.0"?><g:gpx xmlns:g="http://www.topografix.com/GPX/1/1" version="1.1"><g:trk><g:type>cycling</g:type><g:trkseg>
      <g:trkpt lat="50" lon="14"><g:ele>200</g:ele><g:time>2026-11-16T10:00:00Z</g:time></g:trkpt>
      <g:trkpt lat="50.001" lon="14"><g:ele>204</g:ele><g:time>2026-11-16T10:00:10Z</g:time></g:trkpt>
    </g:trkseg></g:trk></g:gpx>`;
    expect(detectFormat(new Uint8Array(bytes(gpx)))).toBe('gpx');
    const activity = await parseActivityFile(bytes(gpx));
    expect(activity.sport).toBe('ride');
    expect(activity.points).toEqual([
      { time: Date.parse('2026-11-16T10:00:00Z'), lat: 50, lon: 14, ele: 200 },
      { time: Date.parse('2026-11-16T10:00:10Z'), lat: 50.001, lon: 14, ele: 204 },
    ]);
  });
});
