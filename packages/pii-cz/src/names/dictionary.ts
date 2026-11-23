import firstNames from '../data/first-names.json' with { type: 'json' };
import { firstNameCandidates } from './inflection.ts';

export type NameGroup = 'male' | 'female' | 'neutral';

const GROUPS: Record<NameGroup, ReadonlySet<string>> = {
  male: new Set(firstNames.male),
  female: new Set(firstNames.female),
  neutral: new Set(firstNames.neutral),
};

/**
 * Entries of the MV list that are also ordinary Czech words („Ale", „Pak", „To" at the start of a
 * sentence) or common product / fund names in this domain („Fond Alfa"). Never a first name.
 */
const NOT_A_NAME = new Set([
  'aby',
  'ale',
  'ani',
  'jak',
  'jen',
  'pak',
  'tam',
  'pole',
  'alfa',
  'beta',
  'gama',
  'delta',
  'omega',
  'sigma',
  'jaro',
  'léto',
  'zima',
  'naděje',
  'sláva',
  'láska',
  'víra',
  'dobra',
  'les',
]);

export const FIRST_NAMES_META = {
  source: firstNames.source,
  sourcePage: firstNames.sourcePage,
  publisher: firstNames.publisher,
  retrievedAt: firstNames.retrievedAt,
  count: GROUPS.male.size + GROUPS.female.size + GROUPS.neutral.size,
} as const;

export interface FirstNameMatch {
  /** Dictionary form, lower-case. */
  lemma: string;
  group: NameGroup;
  /** Matched only after removing a case ending. */
  inflected: boolean;
}

function lookup(word: string): FirstNameMatch | undefined {
  for (const group of ['male', 'female', 'neutral'] as const) {
    if (GROUPS[group].has(word)) return { lemma: word, group, inflected: false };
  }
  return undefined;
}

/** Names shorter than this are ignored („Do", „To", „My" are in the list). */
const MIN_LENGTH = 3;

/**
 * Looks a capitalised word up in the MV first-name list, also in declined forms.
 * Note: the MV list files many common Czech names (Jan, Karel, Michal, Pavla) under NEUTRALNI,
 * so all three groups are searched.
 */
export function matchFirstName(word: string): FirstNameMatch | undefined {
  const lower = word.toLocaleLowerCase('cs');
  if (lower.length < MIN_LENGTH || NOT_A_NAME.has(lower)) return undefined;
  const exact = lookup(lower);
  if (exact) return exact;
  for (const candidate of firstNameCandidates(lower)) {
    if (candidate === lower || candidate.length < MIN_LENGTH || NOT_A_NAME.has(candidate)) continue;
    const match = lookup(candidate);
    if (match) return { ...match, inflected: true };
  }
  return undefined;
}
