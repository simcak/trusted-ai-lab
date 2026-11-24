import type { Fund } from '../funds.ts';
import type { SearchFundsInput } from './schemas.ts';

/** Lower case without diacritics, so „dluhopisové“ finds „dluhopisový“. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

// Words that say nothing about which fund is meant.
const STOPWORDS = new Set([
  'a',
  'i',
  'na',
  'do',
  'pro',
  's',
  'se',
  'z',
  've',
  'v',
  'k',
  'o',
  'jake',
  'jaky',
  'ktere',
  'ktery',
  'mate',
  'nabizite',
  'nejake',
  'vsechny',
  'investicni',
  'fond',
  'fondy',
  'fondu',
  'fondem',
  'fondech',
]);

/** Crude Czech stemming: drop the last two letters of longer words (ending), keep 3 of short ones. */
function stem(token: string): string {
  return token.length <= 4 ? token.slice(0, 3) : token.slice(0, Math.max(4, token.length - 2));
}

export interface FundSummary {
  id: string;
  name: string;
  category: Fund['category'];
  sri: number;
  entryFeePct: number;
  annualFeePct: number;
  description: string;
}

export interface SearchFundsResult {
  count: number;
  results: FundSummary[];
}

/** Deterministic search: every meaningful query word must appear in name, category or description. */
export function searchFunds(funds: readonly Fund[], input: SearchFundsInput): SearchFundsResult {
  const stems = normalize(input.query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
    .map(stem);
  const filters = input.filters ?? {};
  const results = funds
    .filter((f) => filters.category === undefined || f.category === filters.category)
    .filter((f) => filters.maxSri === undefined || f.sri <= filters.maxSri)
    .filter(
      (f) => filters.maxAnnualFeePct === undefined || f.annualFeePct <= filters.maxAnnualFeePct,
    )
    .filter((f) => {
      const haystack = normalize(`${f.name} ${f.category} ${f.description}`);
      return stems.every((s) => haystack.includes(s));
    })
    .map(({ id, name, category, sri, entryFeePct, annualFeePct, description }) => ({
      id,
      name,
      category,
      sri,
      entryFeePct,
      annualFeePct,
      description,
    }));
  return { count: results.length, results };
}
