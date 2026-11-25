import FitParser from 'fit-file-parser';
import { z } from 'zod';
import { sportFromLabel } from './gpx.ts';
import {
  ActivityParseError,
  type MetadataKind,
  type ParsedActivity,
  type TrackPoint,
} from './types.ts';

const optionalNumber = z.number().finite().optional().catch(undefined);
const timestamp = z
  .union([z.date(), z.string(), z.number()])
  .transform((v) => new Date(v).getTime());

/** Only the fields this module reads; everything else in the file is ignored. */
const RecordSchema = z.object({
  timestamp,
  position_lat: optionalNumber,
  position_long: optionalNumber,
  altitude: optionalNumber,
  enhanced_altitude: optionalNumber,
  heart_rate: optionalNumber,
  cadence: optionalNumber,
});

const DeviceSchema = z.object({
  manufacturer: z.unknown().optional(),
  product: z.unknown().optional(),
  product_name: z.unknown().optional(),
  serial_number: z.unknown().optional(),
  software_version: z.unknown().optional(),
});

const FitSchema = z.object({
  records: z.array(z.unknown()).optional(),
  sessions: z.array(z.object({ sport: z.unknown().optional() })).optional(),
  file_ids: z.array(DeviceSchema).optional(),
  device_infos: z.array(DeviceSchema).optional(),
});

/** Binary FIT (Garmin, Wahoo, Coros, …) via fit-file-parser (MIT). */
export async function parseFit(bytes: ArrayBuffer): Promise<ParsedActivity> {
  let raw: unknown;
  try {
    raw = await new FitParser({ mode: 'list', speedUnit: 'm/s', lengthUnit: 'm' }).parseAsync(
      bytes,
    );
  } catch (err) {
    throw new ActivityParseError('invalid_file', err instanceof Error ? err.message : String(err));
  }
  const fit = FitSchema.parse(raw);

  const points: TrackPoint[] = [];
  for (const item of fit.records ?? []) {
    const r = RecordSchema.safeParse(item);
    if (!r.success || !Number.isFinite(r.data.timestamp)) continue;
    const { position_lat: lat, position_long: lon, heart_rate: hr, cadence } = r.data;
    const ele = r.data.enhanced_altitude ?? r.data.altitude;
    points.push({
      time: r.data.timestamp,
      ...(lat !== undefined && lon !== undefined && { lat, lon }),
      ...(ele !== undefined && { ele }),
      ...(hr !== undefined && { hr }),
      ...(cadence !== undefined && { cadence }),
    });
  }

  const dropped = new Set<MetadataKind>();
  for (const d of [...(fit.file_ids ?? []), ...(fit.device_infos ?? [])]) {
    if (d.manufacturer !== undefined) dropped.add('manufacturer');
    if (d.product !== undefined || d.product_name !== undefined) dropped.add('device');
    if (d.serial_number !== undefined) dropped.add('serialNumber');
    if (d.software_version !== undefined) dropped.add('softwareVersion');
  }
  const sport = fit.sessions?.[0]?.sport;
  return {
    format: 'fit',
    sport: sportFromLabel(typeof sport === 'string' ? sport : undefined),
    name: undefined,
    points,
    droppedMetadata: [...dropped],
  };
}
