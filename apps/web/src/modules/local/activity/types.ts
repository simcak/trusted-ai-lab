/** One recorded sample. `time` is milliseconds since the Unix epoch. */
export interface TrackPoint {
  time: number;
  lat?: number;
  lon?: number;
  /** Metres above sea level. */
  ele?: number;
  /** Beats per minute. */
  hr?: number;
  /** Revolutions (or strides) per minute. */
  cadence?: number;
}

export type ActivityFormat = 'gpx' | 'tcx' | 'fit';
export type Sport = 'run' | 'ride' | 'other';

/**
 * What a file carried besides the track. The parsers never copy these values into the activity:
 * only the kind is kept, so the page can say what was thrown away.
 */
export const METADATA_KINDS = [
  'device',
  'manufacturer',
  'serialNumber',
  'softwareVersion',
  'application',
  'author',
] as const;
export type MetadataKind = (typeof METADATA_KINDS)[number];

export interface ParsedActivity {
  format: ActivityFormat;
  sport: Sport;
  /** Name from the file. Shown locally only, never sent to the model (it may contain names). */
  name: string | undefined;
  /** Sorted by time, without duplicate timestamps. */
  points: TrackPoint[];
  droppedMetadata: MetadataKind[];
}

export const PARSE_ERROR_CODES = [
  'unknown_format',
  'invalid_file',
  'no_points',
  'too_large',
] as const;
export type ParseErrorCode = (typeof PARSE_ERROR_CODES)[number];

export class ActivityParseError extends Error {
  override readonly name = 'ActivityParseError';
  readonly code: ParseErrorCode;

  constructor(code: ParseErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}
