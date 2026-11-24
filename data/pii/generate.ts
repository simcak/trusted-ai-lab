/**
 * Generates the synthetic PII corpus with exact gold spans.
 *
 *   node data/pii/generate.ts           # write data/pii/corpus.json
 *   node data/pii/generate.ts --check   # fail if the committed corpus differs (CI)
 *
 * Deterministic: seeded faker (cs_CZ), pinned faker version, fixed reference date.
 * Two splits: `dev` (detectors were tuned on it) and `test` (reported on the page).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Faker, base, cs_CZ } from '@faker-js/faker';
import { Gen, TEMPLATES, type Part, type Template } from './templates.ts';

export const CORPUS_PATH = resolve(import.meta.dirname, 'corpus.json');

const SPLITS = {
  dev: { seed: 1001, size: 100 },
  test: { seed: 2002, size: 300 },
} as const;

/** Reference date for "birth date in the future" checks; keeps the eval independent of today. */
const REFERENCE_DATE = '2026-11-01';
const GENERATOR_VERSION = 1;

const rootPackage = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../package.json'), 'utf8'),
) as { devDependencies: Record<string, string> };

interface Doc {
  id: string;
  split: keyof typeof SPLITS;
  genre: Template['genre'];
  template: string;
  tags: readonly string[];
  text: string;
  spans: { start: number; end: number; type: string }[];
}

function compose(parts: Part[]): Pick<Doc, 'text' | 'spans'> {
  let text = '';
  const spans: Doc['spans'] = [];
  for (const part of parts) {
    if (typeof part === 'string') {
      text += part;
    } else {
      spans.push({ start: text.length, end: text.length + part.text.length, type: part.type });
      text += part.text;
    }
  }
  return { text, spans };
}

function generateSplit(split: keyof typeof SPLITS): Doc[] {
  const { seed, size } = SPLITS[split];
  const faker = new Faker({ locale: [cs_CZ, base] });
  faker.seed(seed);
  const g = new Gen(faker);
  const docs: Doc[] = [];
  let order: Template[] = [];
  while (docs.length < size) {
    // Every template appears once per round, in a seeded random order.
    if (order.length === 0) order = faker.helpers.shuffle([...TEMPLATES]);
    const template = order.pop()!;
    let parts: Part[] | undefined;
    for (let attempt = 0; attempt < 20 && !parts; attempt++) parts = template.build(g);
    if (!parts) throw new Error(`Template ${template.id} failed 20 times`);
    docs.push({
      id: `${split}-${String(docs.length + 1).padStart(4, '0')}`,
      split,
      genre: template.genre,
      template: template.id,
      tags: template.tags,
      ...compose(parts),
    });
  }
  return docs;
}

export function generateCorpus() {
  return {
    schemaVersion: 1 as const,
    generator: 'data/pii/generate.ts',
    generatorVersion: GENERATOR_VERSION,
    fakerVersion: rootPackage.devDependencies['@faker-js/faker'] ?? 'unknown',
    referenceDate: REFERENCE_DATE,
    splits: SPLITS,
    note: 'Syntetická data. Hodnoty jsou náhodné a platné jen podle kontrolních součtů; shoda se skutečnou osobou je náhodná.',
    documents: [...generateSplit('dev'), ...generateSplit('test')],
  };
}

if (import.meta.main) {
  const json = `${JSON.stringify(generateCorpus(), null, 2)}\n`;
  if (process.argv.includes('--check')) {
    const committed = readFileSync(CORPUS_PATH, 'utf8');
    if (committed !== json) {
      console.error('data/pii/corpus.json is out of date. Run: pnpm generate:pii');
      process.exit(1);
    }
    console.log('data/pii/corpus.json is up to date.');
  } else {
    writeFileSync(CORPUS_PATH, json);
    const corpus = JSON.parse(json) as { documents: Doc[] };
    const spans = corpus.documents.flatMap((d) => d.spans);
    const byType: Record<string, number> = {};
    for (const s of spans) byType[s.type] = (byType[s.type] ?? 0) + 1;
    console.log(`Wrote ${corpus.documents.length} documents, ${spans.length} gold spans:`, byType);
  }
}
