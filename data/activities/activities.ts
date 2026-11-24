/**
 * Synthetic sport activities for module 4 (no real person, no real recording).
 *
 * Pure functions only (no file system), so tests can import the same truth the files were built
 * from. `generate.ts` writes the files and `--check` verifies them in CI.
 *
 * The athlete leaves a fictional "home", runs or rides a procedural loop and comes back, so the
 * privacy zone has something to hide. Routes do not follow streets.
 */
import { FitBaseType, FitEncoder, type FitEncoderField } from 'fit-file-parser/encoder';

export const GENERATOR_VERSION = 1;

/** Fictional home of the synthetic athlete (city park, Brno). */
export const HOME = { lat: 49.20785, lon: 16.60865 } as const;

/** Heart-rate parameters the synthetic athlete was simulated with. */
export const ATHLETE = { maxHr: 195, restHr: 55 } as const;

export const DEVICE = {
  watch: 'Ukázkové hodinky S1',
  bikeComputer: 'Ukázkový cyklopočítač C1',
  app: 'Ukázková aplikace',
  serialNumber: 3141592653,
} as const;

export type SampleFormat = 'gpx' | 'tcx' | 'fit';
export type SampleSport = 'run' | 'ride';

export interface SampleMeta {
  id: 'run' | 'ride' | 'intervals';
  file: string;
  format: SampleFormat;
  sport: SampleSport;
  title: string;
  startTime: string;
  intervalS: number;
  samples: number;
  durationS: number;
  /** Length of the noise-free route; GPS noise makes the measured distance slightly longer. */
  pathLengthM: number;
  /** Straight leg from home to the loop and back. */
  approachM: number;
}

export interface GeneratedActivity {
  meta: SampleMeta;
  content: string | Uint8Array;
}

// ---------------------------------------------------------------------------------------------
// Randomness and geometry

/** mulberry32: tiny seeded PRNG, enough for synthetic noise. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rnd: () => number): number {
  const u = 1 - rnd();
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Metres per degree of latitude for R = 6 371 000 m. */
const M_PER_DEG = (6_371_000 * Math.PI) / 180;

interface Xy {
  x: number; // east, metres from home
  y: number; // north, metres from home
}

function toLatLon(p: Xy): { lat: number; lon: number } {
  return {
    lat: HOME.lat + p.y / M_PER_DEG,
    lon: HOME.lon + p.x / (M_PER_DEG * Math.cos((HOME.lat * Math.PI) / 180)),
  };
}

interface Path {
  points: Xy[];
  cumulative: number[];
  length: number;
}

function makePath(points: Xy[]): Path {
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    cumulative.push(cumulative[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return { points, cumulative, length: cumulative.at(-1)! };
}

/**
 * Home → straight leg → `loops` turns of a wobbly circle → the same leg back home.
 * The circle touches the end of the leg, so the route is continuous.
 */
function loopRoute(options: {
  approach: number;
  headingDeg: number;
  radius: number;
  loops: number;
  wobble: number;
}): Path {
  const { approach, radius, loops, wobble } = options;
  const h = (options.headingDeg * Math.PI) / 180;
  const dir = { x: Math.cos(h), y: Math.sin(h) };
  const legEnd = { x: approach * dir.x, y: approach * dir.y };
  const centre = { x: legEnd.x + radius * dir.x, y: legEnd.y + radius * dir.y };
  const phi0 = h + Math.PI;

  const pts: Xy[] = [];
  const legSteps = Math.max(1, Math.round(approach / 5));
  for (let i = 0; i <= legSteps; i++)
    pts.push({ x: (legEnd.x * i) / legSteps, y: (legEnd.y * i) / legSteps });
  const loopSteps = Math.round(720 * loops);
  for (let i = 1; i <= loopSteps; i++) {
    const u = (i / loopSteps) * loops * 2 * Math.PI;
    const r = radius * (1 + wobble * Math.sin(3 * u));
    pts.push({ x: centre.x + r * Math.cos(phi0 + u), y: centre.y + r * Math.sin(phi0 + u) });
  }
  for (let i = legSteps - 1; i >= 0; i--)
    pts.push({ x: (legEnd.x * i) / legSteps, y: (legEnd.y * i) / legSteps });
  return makePath(pts);
}

/** Radius for which `loopRoute` has the requested total length (length is linear in radius). */
function radiusForLength(
  total: number,
  shape: Omit<Parameters<typeof loopRoute>[0], 'radius'>,
): number {
  const unit = loopRoute({ ...shape, radius: 1 }).length - 2 * shape.approach;
  return (total - 2 * shape.approach) / unit;
}

function positionAt(path: Path, s: number): Xy {
  const { cumulative, points } = path;
  if (s >= path.length) return points.at(-1)!;
  let lo = 0;
  let hi = cumulative.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid]! <= s) lo = mid;
    else hi = mid;
  }
  const a = points[lo]!;
  const b = points[hi]!;
  const span = cumulative[hi]! - cumulative[lo]!;
  const f = span > 0 ? (s - cumulative[lo]!) / span : 0;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

// ---------------------------------------------------------------------------------------------
// Simulation

interface Sample {
  t: number; // seconds from start
  lat: number;
  lon: number;
  ele: number;
  s: number; // true distance along the route, metres
  speed: number; // m/s
  hr: number;
  cadence?: number;
}

interface SimulationOptions {
  seed: number;
  path: Path;
  dt: number;
  elevation: (s: number) => number;
  speed: (t: number, grade: number) => number;
  intensity: (t: number, grade: number) => number;
  cadence?: (speed: number, grade: number) => number;
  stop?: { atM: number; durationS: number };
}

/** HR follows the target with a first-order lag; GPS and altitude get small Gaussian noise. */
function simulate(o: SimulationOptions): Sample[] {
  const rnd = mulberry32(o.seed);
  const out: Sample[] = [];
  const lag = 1 - Math.exp(-o.dt / 30);
  let t = 0;
  let s = 0;
  let hr = 85;
  let stopUntil = -1;
  let stopped = false;
  for (;;) {
    const grade = (o.elevation(s + 10) - o.elevation(s)) / 10;
    let v = o.speed(t, grade) * (1 + 0.02 * gaussian(rnd));
    if (o.stop && !stopped && s >= o.stop.atM) {
      stopped = true;
      stopUntil = t + o.stop.durationS;
    }
    if (t < stopUntil) v = 0;

    const target = ATHLETE.restHr + o.intensity(t, grade) * (ATHLETE.maxHr - ATHLETE.restHr);
    hr += (target - hr) * lag;

    const p = positionAt(o.path, s);
    const noisy = toLatLon({ x: p.x + 1.5 * gaussian(rnd), y: p.y + 1.5 * gaussian(rnd) });
    out.push({
      t,
      lat: noisy.lat,
      lon: noisy.lon,
      ele: o.elevation(s) + 0.4 * gaussian(rnd),
      s,
      speed: v,
      hr: Math.round(hr + 1.2 * gaussian(rnd)),
      ...(o.cadence && {
        cadence: Math.max(0, Math.round(o.cadence(v, grade) + 2 * gaussian(rnd))),
      }),
    });
    if (s >= o.path.length) break;
    s = Math.min(o.path.length, s + v * o.dt);
    t += o.dt;
  }
  return out;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const wave = (s: number, amp: number, period: number, phase = 0) =>
  amp * Math.sin((2 * Math.PI * s) / period + phase);

// ---------------------------------------------------------------------------------------------
// The three activities

function eveningRun(): { meta: SampleMeta; samples: Sample[] } {
  const approach = 700;
  const path = loopRoute({ approach, headingDeg: 20, radius: 740, loops: 1, wobble: 0.12 });
  const elevation = (s: number) => 236 + wave(s, 9, 2400) + wave(s, 3, 700, 1);
  const samples = simulate({
    seed: 1601,
    path,
    dt: 3,
    elevation,
    speed: (_t, g) => clamp(3.0 * (1 - 4 * g), 2.3, 3.5),
    intensity: (t, g) => clamp(0.6 + 3 * g + 0.00002 * t, 0.5, 0.75),
    stop: { atM: 2500, durationS: 42 },
  });
  return {
    meta: meta(
      'run',
      'vecerni-beh.gpx',
      'gpx',
      'run',
      'Večerní běh',
      '2026-11-16T17:30:00Z',
      3,
      samples,
      path,
      approach,
    ),
    samples,
  };
}

function hillyRide(): { meta: SampleMeta; samples: Sample[] } {
  const approach = 900;
  const path = loopRoute({ approach, headingDeg: 200, radius: 3500, loops: 1, wobble: 0.18 });
  const elevation = (s: number) => 245 + wave(s, 32, 7000) + wave(s, 11, 2600, 1);
  const samples = simulate({
    seed: 1802,
    path,
    dt: 5,
    elevation,
    speed: (_t, g) => clamp(7.8 - 60 * g, 3.5, 13),
    intensity: (_t, g) => clamp(0.5 + 6 * g, 0.35, 0.88),
    cadence: (v, g) => (g < -0.03 && v > 11 ? 0 : clamp(88 - 150 * g, 60, 100)),
  });
  return {
    meta: meta(
      'ride',
      'vyjizdka-na-kole.tcx',
      'tcx',
      'ride',
      'Vyjížďka na kole',
      '2026-11-18T14:00:00Z',
      5,
      samples,
      path,
      approach,
    ),
    samples,
  };
}

const INTERVAL_PHASES: { durationS: number; speed: number; intensity: number }[] = [
  { durationS: 600, speed: 2.8, intensity: 0.58 },
  ...Array.from({ length: 6 }, () => [
    { durationS: 120, speed: 4.6, intensity: 0.93 },
    { durationS: 120, speed: 2.3, intensity: 0.62 },
  ]).flat(),
  { durationS: 480, speed: 2.6, intensity: 0.55 },
];

function phaseAt(t: number) {
  let end = 0;
  for (const phase of INTERVAL_PHASES) {
    end += phase.durationS;
    if (t < end) return phase;
  }
  return INTERVAL_PHASES.at(-1)!;
}

function intervals(): { meta: SampleMeta; samples: Sample[] } {
  const approach = 1200;
  const total = INTERVAL_PHASES.reduce((sum, p) => sum + p.durationS * p.speed, 0);
  const shape = { approach, headingDeg: 110, loops: 4, wobble: 0.05 };
  const path = loopRoute({ ...shape, radius: radiusForLength(total, shape) });
  const elevation = (s: number) => 228 + wave(s, 2, 1600);
  const samples = simulate({
    seed: 2103,
    path,
    dt: 2,
    elevation,
    speed: (t) => phaseAt(t).speed,
    intensity: (t) => phaseAt(t).intensity,
  });
  return {
    meta: meta(
      'intervals',
      'intervaly.fit',
      'fit',
      'run',
      'Intervaly 6 × 2 minuty',
      '2026-11-21T08:00:00Z',
      2,
      samples,
      path,
      approach,
    ),
    samples,
  };
}

function meta(
  id: SampleMeta['id'],
  file: string,
  format: SampleFormat,
  sport: SampleSport,
  title: string,
  startTime: string,
  intervalS: number,
  samples: Sample[],
  path: Path,
  approachM: number,
): SampleMeta {
  return {
    id,
    file,
    format,
    sport,
    title,
    startTime,
    intervalS,
    samples: samples.length,
    durationS: samples.at(-1)!.t,
    pathLengthM: Math.round(path.length * 10) / 10,
    approachM,
  };
}

// ---------------------------------------------------------------------------------------------
// Writers

const iso = (start: string, t: number) =>
  new Date(Date.parse(start) + t * 1000).toISOString().replace('.000Z', 'Z');
const fixed = (x: number, digits: number) => x.toFixed(digits);

function toGpx(meta: SampleMeta, samples: Sample[]): string {
  const points = samples
    .map(
      (p) =>
        `      <trkpt lat="${fixed(p.lat, 7)}" lon="${fixed(p.lon, 7)}"><ele>${fixed(p.ele, 1)}</ele>` +
        `<time>${iso(meta.startTime, p.t)}</time><extensions><gpxtpx:TrackPointExtension>` +
        `<gpxtpx:hr>${p.hr}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="${DEVICE.watch}" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
  <metadata>
    <name>${meta.title}</name>
    <author><name>Ukázkový sportovec</name></author>
    <time>${meta.startTime}</time>
  </metadata>
  <trk>
    <name>${meta.title}</name>
    <type>running</type>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
}

function toTcx(meta: SampleMeta, samples: Sample[]): string {
  const points = samples
    .map(
      (p) =>
        `          <Trackpoint><Time>${iso(meta.startTime, p.t)}</Time>` +
        `<Position><LatitudeDegrees>${fixed(p.lat, 7)}</LatitudeDegrees><LongitudeDegrees>${fixed(p.lon, 7)}</LongitudeDegrees></Position>` +
        `<AltitudeMeters>${fixed(p.ele, 1)}</AltitudeMeters><DistanceMeters>${fixed(p.s, 1)}</DistanceMeters>` +
        `<HeartRateBpm><Value>${p.hr}</Value></HeartRateBpm><Cadence>${p.cadence ?? 0}</Cadence></Trackpoint>`,
    )
    .join('\n');
  const last = samples.at(-1)!;
  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Activities>
    <Activity Sport="Biking">
      <Id>${meta.startTime}</Id>
      <Lap StartTime="${meta.startTime}">
        <TotalTimeSeconds>${fixed(last.t, 1)}</TotalTimeSeconds>
        <DistanceMeters>${fixed(last.s, 1)}</DistanceMeters>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Track>
${points}
        </Track>
      </Lap>
      <Notes>${meta.title}</Notes>
      <Creator xsi:type="Device_t">
        <Name>${DEVICE.bikeComputer}</Name>
        <UnitId>${DEVICE.serialNumber}</UnitId>
        <ProductID>1</ProductID>
        <Version><VersionMajor>1</VersionMajor><VersionMinor>0</VersionMinor></Version>
      </Creator>
    </Activity>
  </Activities>
  <Author xsi:type="Application_t">
    <Name>${DEVICE.app}</Name>
    <LangID>cs</LangID>
  </Author>
</TrainingCenterDatabase>
`;
}

// FIT profile numbers (global message and field definition numbers).
const MESG = {
  fileId: 0,
  session: 18,
  lap: 19,
  record: 20,
  event: 21,
  deviceInfo: 23,
  activity: 34,
} as const;
const MANUFACTURER_DEVELOPMENT = 255;
const SEMICIRCLES = 2 ** 31 / 180;

const u8 = (number: number, value: number): FitEncoderField => ({
  number,
  size: 1,
  baseType: FitBaseType.Uint8,
  value,
});
const en = (number: number, value: number): FitEncoderField => ({
  number,
  size: 1,
  baseType: FitBaseType.Enum,
  value,
});
const u16 = (number: number, value: number): FitEncoderField => ({
  number,
  size: 2,
  baseType: FitBaseType.Uint16,
  value,
});
const u32 = (number: number, value: number): FitEncoderField => ({
  number,
  size: 4,
  baseType: FitBaseType.Uint32,
  value,
});
const s32 = (number: number, value: number): FitEncoderField => ({
  number,
  size: 4,
  baseType: FitBaseType.Sint32,
  value,
});
const u32z = (number: number, value: number): FitEncoderField => ({
  number,
  size: 4,
  baseType: FitBaseType.Uint32z,
  value,
});
const str = (number: number, value: string): FitEncoderField => {
  const bytes = FitEncoder.string(value);
  return { number, size: bytes.byteLength, baseType: FitBaseType.String, value: bytes };
};

/** Scales and offsets of the FIT profile are applied here; the encoder writes raw values. */
function toFit(meta: SampleMeta, samples: Sample[]): Uint8Array {
  const start = Date.parse(meta.startTime);
  const ts = (t: number) => FitEncoder.toFitTimestamp(new Date(start + t * 1000));
  const last = samples.at(-1)!;
  const e = new FitEncoder();

  e.writeMessage(
    MESG.fileId,
    [
      en(0, 4),
      u16(1, MANUFACTURER_DEVELOPMENT),
      u16(2, 1),
      u32z(3, DEVICE.serialNumber),
      u32(4, ts(0)),
    ],
    0,
  );
  e.writeMessage(
    MESG.deviceInfo,
    [
      u32(253, ts(0)),
      u8(0, 0),
      u16(2, MANUFACTURER_DEVELOPMENT),
      u32z(3, DEVICE.serialNumber),
      u16(4, 1),
      u16(5, 100),
      str(27, DEVICE.watch),
    ],
    1,
  );
  e.writeMessage(MESG.event, [u32(253, ts(0)), en(0, 0), en(1, 0)], 2);
  for (const p of samples) {
    e.writeMessage(
      MESG.record,
      [
        u32(253, ts(p.t)),
        s32(0, Math.round(p.lat * SEMICIRCLES)),
        s32(1, Math.round(p.lon * SEMICIRCLES)),
        u16(2, Math.round((p.ele + 500) * 5)),
        u8(3, p.hr),
        u32(5, Math.round(p.s * 100)),
        u16(6, Math.round(p.speed * 1000)),
      ],
      3,
    );
  }
  e.writeMessage(MESG.event, [u32(253, ts(last.t)), en(0, 0), en(1, 4)], 2);
  const totals = [
    u32(2, ts(0)),
    u32(7, Math.round(last.t * 1000)),
    u32(8, Math.round(last.t * 1000)),
    u32(9, Math.round(last.s * 100)),
  ];
  e.writeMessage(MESG.lap, [u32(253, ts(last.t)), en(0, 9), en(1, 1), ...totals, en(25, 1)], 4);
  e.writeMessage(
    MESG.session,
    [
      u32(253, ts(last.t)),
      en(0, 8),
      en(1, 1),
      ...totals,
      en(5, 1),
      en(6, 0),
      u16(25, 0),
      u16(26, 1),
    ],
    5,
  );
  e.writeMessage(
    MESG.activity,
    [
      u32(253, ts(last.t)),
      u32(0, Math.round(last.t * 1000)),
      u16(1, 1),
      en(2, 0),
      en(3, 26),
      en(4, 1),
      u32(5, ts(last.t) + 3600),
    ],
    6,
  );
  return e.close();
}

export function generateActivities(): GeneratedActivity[] {
  const run = eveningRun();
  const ride = hillyRide();
  const fit = intervals();
  return [
    { meta: run.meta, content: toGpx(run.meta, run.samples) },
    { meta: ride.meta, content: toTcx(ride.meta, ride.samples) },
    { meta: fit.meta, content: toFit(fit.meta, fit.samples) },
  ];
}

export interface Manifest {
  schemaVersion: 1;
  generator: string;
  generatorVersion: number;
  note: string;
  athlete: typeof ATHLETE;
  activities: SampleMeta[];
}

export function buildManifest(activities: GeneratedActivity[]): Manifest {
  return {
    schemaVersion: 1,
    generator: 'data/activities/generate.ts',
    generatorVersion: GENERATOR_VERSION,
    note: 'Syntetická data: smyšlený sportovec, smyšlené zařízení, procedurální trasy, které nesledují ulice. Nejde o záznam skutečné osoby.',
    athlete: ATHLETE,
    activities: activities.map((a) => a.meta),
  };
}
