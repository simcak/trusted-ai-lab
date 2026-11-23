/**
 * Downloads the official reference data used by packages/pii-cz and stores it as JSON with
 * provenance (source URL, retrieval date). Run manually when the sources change — never in CI
 * (CI must not depend on third-party websites).
 *
 *   node scripts/fetch-pii-reference-data.ts
 *
 * Sources (see THIRD_PARTY.md):
 * - First names: Ministerstvo vnitra ČR, „Seznam jmen" (open-data CSV of registrable first names).
 * - Bank codes: Česká národní banka, „Číselník kódů bank" (CSV).
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FIRST_NAMES_URL =
  'https://mv.gov.cz/documents/opendata-seznamjmenk2026-06-30?disposition=attachment';
const FIRST_NAMES_PAGE = 'https://mv.gov.cz/seznam-jmen';
const BANK_CODES_URL =
  'https://www.cnb.cz/cs/platebni-styk/.galleries/ucty_kody_bank/download/kody_bank_CR.csv';
const BANK_CODES_PAGE = 'https://www.cnb.cz/cs/platebni-styk/ucty-kody-bank/';
/** Shown on BANK_CODES_PAGE next to the CSV link at retrieval time. */
const BANK_CODES_VALID_FROM = '2026-10-01';
const BANK_CODES_LIST_NUMBER = 255;

const outDir = resolve(import.meta.dirname, '../packages/pii-cz/src/data');
const retrievedAt = new Date().toISOString().slice(0, 10);

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': 'trusted-ai-lab reference-data fetch' },
  });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return (await res.text()).replace(/^\uFEFF/, '');
}

const collator = new Intl.Collator('cs');
const sortedUnique = (values: Iterable<string>) => [...new Set(values)].sort(collator.compare);

async function firstNames() {
  const csv = await fetchText(FIRST_NAMES_URL);
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  if (header?.trim() !== 'DRUH_JMENA,JMENO') throw new Error(`Unexpected header: ${header}`);

  // The CSV spells the neutral group both with and without the accent.
  const kindMap: Record<string, 'female' | 'male' | 'neutral'> = {
    ZENA: 'female',
    MUZ: 'male',
    NEUTRALNI: 'neutral',
    NEUTRÁLNI: 'neutral',
  };
  const groups = { female: [] as string[], male: [] as string[], neutral: [] as string[] };
  for (const row of rows) {
    const [kind, name] = row.split(',').map((s) => s.trim());
    if (!kind || !name) continue;
    const group = kindMap[kind];
    if (!group) throw new Error(`Unknown DRUH_JMENA "${kind}"`);
    // Some entries carry footnote marks („KAREL **"); keep just the name.
    groups[group].push(name.replace(/\s*\*+$/, '').toLocaleLowerCase('cs'));
  }
  console.log(
    `first names: ${rows.length} rows → female ${groups.female.length}, male ${groups.male.length}, neutral ${groups.neutral.length}`,
  );

  const data = {
    source: FIRST_NAMES_URL,
    sourcePage: FIRST_NAMES_PAGE,
    publisher: 'Ministerstvo vnitra České republiky',
    title: 'Seznam jmen (open data CSV)',
    licenceNote:
      'Licence u souboru neuvedena; katalog otevřených dat MV uvádí „bez licenčních omezení“. Viz THIRD_PARTY.md a docs/OPEN_QUESTIONS.md.',
    retrievedAt,
    /** Lower-cased names grouped by the CSV column DRUH_JMENA (ZENA / MUZ / NEUTRALNI). */
    female: sortedUnique(groups.female),
    male: sortedUnique(groups.male),
    neutral: sortedUnique(groups.neutral),
  };
  writeFileSync(resolve(outDir, 'first-names.json'), `${JSON.stringify(data)}\n`);
}

async function bankCodes() {
  const csv = await fetchText(BANK_CODES_URL);
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  if (!header?.startsWith('Kód platebního styku;')) throw new Error(`Unexpected header: ${header}`);
  const codes = rows
    .map((row) => row.split(';').map((s) => s.trim()))
    .filter(([code]) => code && /^\d{4}$/.test(code))
    .map(([code, name]) => ({ code: code!, name: name ?? '' }));
  console.log(`bank codes: ${codes.length}`);

  const data = {
    source: BANK_CODES_URL,
    sourcePage: BANK_CODES_PAGE,
    publisher: 'Česká národní banka',
    title: `Číselník kódů bank č. ${BANK_CODES_LIST_NUMBER}`,
    validFrom: BANK_CODES_VALID_FROM,
    retrievedAt,
    codes,
  };
  writeFileSync(resolve(outDir, 'bank-codes.json'), `${JSON.stringify(data, null, 2)}\n`);
}

await firstNames();
await bankCodes();
