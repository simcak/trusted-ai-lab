import { sportFromLabel } from './gpx.ts';
import { byName, child, num, parseXml, text, time } from './xml.ts';
import type { MetadataKind, ParsedActivity } from './types.ts';

/** Garmin Training Center XML (TCX v2): `Activity > Lap > Track > Trackpoint`. */
export function parseTcx(source: string): ParsedActivity {
  const doc = parseXml(source);
  const activity = byName(doc, 'Activity')[0];
  const points = byName(doc, 'Trackpoint').flatMap((tp) => {
    const t = time(child(tp, 'Time')?.textContent);
    if (t === undefined) return [];
    const position = child(tp, 'Position');
    const lat = position && num(child(position, 'LatitudeDegrees')?.textContent);
    const lon = position && num(child(position, 'LongitudeDegrees')?.textContent);
    const ele = num(child(tp, 'AltitudeMeters')?.textContent);
    const hrEl = child(tp, 'HeartRateBpm');
    const hr = hrEl && num(child(hrEl, 'Value')?.textContent);
    const cadence = num(child(tp, 'Cadence')?.textContent);
    return [
      {
        time: t,
        ...(lat !== undefined && lon !== undefined && { lat, lon }),
        ...(ele !== undefined && { ele }),
        ...(hr !== undefined && { hr }),
        ...(cadence !== undefined && { cadence }),
      },
    ];
  });

  const dropped: MetadataKind[] = [];
  const creator = activity && child(activity, 'Creator');
  if (creator) {
    if (child(creator, 'Name')) dropped.push('device');
    if (child(creator, 'UnitId')) dropped.push('serialNumber');
    if (child(creator, 'Version')) dropped.push('softwareVersion');
  }
  if (byName(doc, 'Author').length > 0) dropped.push('application');

  return {
    format: 'tcx',
    sport: sportFromLabel(activity?.getAttribute('Sport') ?? undefined),
    name: activity ? text(activity, 'Notes') : undefined,
    points,
    droppedMetadata: dropped,
  };
}
