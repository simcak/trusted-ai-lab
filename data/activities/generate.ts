/**
 * Writes the three synthetic sample activities for module 4 and their manifest.
 *
 *   node data/activities/generate.ts           # write the files
 *   node data/activities/generate.ts --check   # fail if the committed files differ (CI)
 *
 * Deterministic: seeded PRNG, fixed dates, no dependency on the current time.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildManifest, generateActivities } from './activities.ts';

const DIR = import.meta.dirname;

function outputs(): { path: string; bytes: Uint8Array }[] {
  const activities = generateActivities();
  const encoder = new TextEncoder();
  const files = activities.map((a) => ({
    path: resolve(DIR, a.meta.file),
    bytes: typeof a.content === 'string' ? encoder.encode(a.content) : a.content,
  }));
  files.push({
    path: resolve(DIR, 'manifest.json'),
    bytes: encoder.encode(JSON.stringify(buildManifest(activities), null, 2) + '\n'),
  });
  return files;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.byteLength === b.byteLength && a.every((x, i) => x === b[i]);
}

if (import.meta.main) {
  const files = outputs();
  if (process.argv.includes('--check')) {
    const stale = files.filter((f) => {
      try {
        return !sameBytes(new Uint8Array(readFileSync(f.path)), f.bytes);
      } catch {
        return true;
      }
    });
    if (stale.length) {
      for (const f of stale) console.error(`${f.path} is out of date.`);
      console.error('Run: pnpm generate:activities');
      process.exit(1);
    }
    console.log(`data/activities: ${files.length} files up to date`);
  } else {
    for (const f of files) {
      writeFileSync(f.path, f.bytes);
      console.log(`wrote ${f.path} (${f.bytes.byteLength} B)`);
    }
  }
}
