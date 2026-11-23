/**
 * Performance budget guard (CLAUDE.md §3): initial JS must stay below 300 kB gzip.
 * "Initial JS" = the entry script plus every modulepreload chunk referenced by dist/index.html.
 * Lazy module chunks are excluded on purpose — they load only when the user opens a module.
 *
 * Usage: node scripts/check-bundle-size.ts   (after `pnpm build`)
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 300;
const BASE_PATH = '/trusted-ai-lab/';
const distDir = resolve(import.meta.dirname, '../apps/web/dist');
const indexHtml = join(distDir, 'index.html');

if (!existsSync(indexHtml)) {
  console.error(`Missing ${indexHtml}. Run \`pnpm build\` first.`);
  process.exit(1);
}

const html = readFileSync(indexHtml, 'utf8');
const scriptSrcs = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+\.js)"/g)];
const preloadHrefs = [
  ...html.matchAll(/<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+\.js)"/g),
];
const files = [...new Set([...scriptSrcs, ...preloadHrefs].map((m) => m[1]!))];

if (files.length === 0) {
  console.error('No initial JS found in index.html — has the build output format changed?');
  process.exit(1);
}

let totalBytes = 0;
for (const href of files) {
  const relative = href.startsWith(BASE_PATH) ? href.slice(BASE_PATH.length) : href;
  const gzipped = gzipSync(readFileSync(join(distDir, relative)), { level: 9 }).length;
  totalBytes += gzipped;
  console.log(`${(gzipped / 1024).toFixed(1).padStart(8)} kB  ${relative}`);
}

const totalKb = totalBytes / 1024;
console.log(
  `${totalKb.toFixed(1).padStart(8)} kB  total initial JS (gzip), budget ${BUDGET_KB} kB`,
);

if (totalKb > BUDGET_KB) {
  console.error(`Initial JS exceeds the ${BUDGET_KB} kB gzip budget.`);
  process.exit(1);
}
