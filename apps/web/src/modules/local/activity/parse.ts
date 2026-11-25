import { parseFit } from './fit.ts';
import { parseGpx } from './gpx.ts';
import { parseTcx } from './tcx.ts';
import {
  ActivityParseError,
  type ActivityFormat,
  type ParsedActivity,
  type TrackPoint,
} from './types.ts';

/** Larger files are refused: a long ride with 1 s sampling is a few MB. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** FIT files carry ".FIT" at bytes 8–11 of the header; XML formats are told apart by their root. */
export function detectFormat(bytes: Uint8Array): ActivityFormat | undefined {
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(8, 12)) === '.FIT') return 'fit';
  const head = new TextDecoder().decode(bytes.subarray(0, 2048));
  if (/<(?:[\w-]+:)?gpx[\s>]/.test(head)) return 'gpx';
  if (/<(?:[\w-]+:)?TrainingCenterDatabase[\s>]/.test(head)) return 'tcx';
  return undefined;
}

/** Parses a GPX, TCX or FIT file entirely in the browser. */
export async function parseActivityFile(buffer: ArrayBuffer): Promise<ParsedActivity> {
  if (buffer.byteLength > MAX_FILE_BYTES) throw new ActivityParseError('too_large');
  const bytes = new Uint8Array(buffer);
  const format = detectFormat(bytes);
  let activity: ParsedActivity;
  if (format === 'fit') activity = await parseFit(buffer);
  else if (format === 'gpx') activity = parseGpx(new TextDecoder().decode(bytes));
  else if (format === 'tcx') activity = parseTcx(new TextDecoder().decode(bytes));
  else throw new ActivityParseError('unknown_format');

  const points = normalise(activity.points);
  if (points.length < 2) throw new ActivityParseError('no_points');
  return { ...activity, points };
}

/** Sorted by time, one point per timestamp (the first wins). */
export function normalise(points: readonly TrackPoint[]): TrackPoint[] {
  const sorted = [...points].sort((a, b) => a.time - b.time);
  return sorted.filter((p, i) => i === 0 || p.time !== sorted[i - 1]!.time);
}
