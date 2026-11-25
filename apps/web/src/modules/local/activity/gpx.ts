import { byName, child, num, parseXml, text, time } from './xml.ts';
import type { MetadataKind, ParsedActivity, Sport, TrackPoint } from './types.ts';

const RUN = /run|běh|^9$/i;
const RIDE = /bik|cycl|ride|kolo|^1$/i;

export function sportFromLabel(label: string | undefined): Sport {
  if (!label) return 'other';
  if (RUN.test(label)) return 'run';
  if (RIDE.test(label)) return 'ride';
  return 'other';
}

/** GPX 1.0/1.1 track. Heart rate and cadence come from TrackPointExtension (`hr`, `cad`). */
export function parseGpx(source: string): ParsedActivity {
  const doc = parseXml(source);
  const root = doc.documentElement;
  const points: TrackPoint[] = [];
  for (const pt of byName(doc, 'trkpt')) {
    const t = time(child(pt, 'time')?.textContent);
    if (t === undefined) continue;
    const lat = num(pt.getAttribute('lat'));
    const lon = num(pt.getAttribute('lon'));
    const ele = num(child(pt, 'ele')?.textContent);
    const hr = num(text(pt, 'hr'));
    const cadence = num(text(pt, 'cad'));
    points.push({
      time: t,
      ...(lat !== undefined && lon !== undefined && { lat, lon }),
      ...(ele !== undefined && { ele }),
      ...(hr !== undefined && { hr }),
      ...(cadence !== undefined && { cadence }),
    });
  }

  const dropped: MetadataKind[] = [];
  if (root.getAttribute('creator')) dropped.push('application');
  const metadata = byName(doc, 'metadata')[0];
  if (metadata && child(metadata, 'author')) dropped.push('author');

  const track = byName(doc, 'trk')[0];
  const trackName = track && child(track, 'name')?.textContent?.trim();
  return {
    format: 'gpx',
    sport: sportFromLabel(track && child(track, 'type')?.textContent?.trim()),
    name: trackName ? trackName : metadata && text(metadata, 'name'),
    points,
    droppedMetadata: dropped,
  };
}
