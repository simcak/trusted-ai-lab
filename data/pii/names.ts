/**
 * Declension of generated names for the corpus (dative, instrumental, vocative).
 * Written independently of the library's lemmatiser (which goes the other way); covers the
 * regular paradigms only and returns `undefined` when a name does not fit them — templates then
 * fall back to a sentence with the nominative.
 */
import type { Sex } from './values.ts';

export type Case = 'nom' | 'dat' | 'ins' | 'voc';

/** Names with a mobile e (Pavel → Pavla, Marek → Marka). */
const MOBILE_E: Record<string, string> = {
  Pavel: 'Pavl',
  Karel: 'Karl',
  Marek: 'Mark',
  Radek: 'Radk',
  Hynek: 'Hynk',
  Zdeněk: 'Zdeňk',
  Luděk: 'Luďk',
  Mirek: 'Mirk',
  Leošek: 'Leošk',
};

const SOFT = 'šžčřcjťďň';

function masculineConsonant(stem: string, c: Case): string {
  switch (c) {
    case 'nom':
      return stem;
    case 'dat':
      return `${stem}ovi`;
    case 'ins':
      return `${stem}em`;
    case 'voc': {
      const last = stem.at(-1)!;
      if ('khg'.includes(last) || stem.endsWith('ch')) return `${stem}u`;
      if (SOFT.includes(last)) return `${stem}i`;
      if (last === 'r' && !'aeiouyáéíóúůý'.includes(stem.at(-2) ?? '')) {
        return `${stem.slice(0, -1)}ře`;
      }
      return `${stem}e`;
    }
  }
}

function inflectMasculine(word: string, c: Case): string | undefined {
  if (c === 'nom') return word;
  const mobile = MOBILE_E[word];
  if (mobile) return masculineConsonant(mobile, c);
  if (/ý$/.test(word)) {
    const stem = word.slice(0, -1);
    return { dat: `${stem}ému`, ins: `${stem}ým`, voc: word }[c];
  }
  if (/í$/.test(word)) {
    return { dat: `${word}mu`, ins: `${word}m`, voc: word }[c];
  }
  if (/a$/.test(word)) {
    const stem = word.slice(0, -1);
    return { dat: `${stem}ovi`, ins: `${stem}ou`, voc: `${stem}o` }[c];
  }
  if (/[eě]k$/.test(word) && word.length > 4) {
    // Mobile e: Hájek → Hájk-, Vaněk → Vaňk-.
    const before = word.slice(0, -2);
    const base =
      word.at(-2) === 'ě' ? `${before.slice(0, -1)}${softenN(before.at(-1)!)}k` : `${before}k`;
    return masculineConsonant(base, c);
  }
  if (/ec$/.test(word) || /el$/.test(word) || /[ůuoiye]$/.test(word)) return undefined;
  if (/[bcčdďfghchjklmnňprřsštťvzž]$/.test(word)) return masculineConsonant(word, c);
  return undefined;
}

const softenN = (ch: string) => ({ n: 'ň', d: 'ď', t: 'ť' })[ch] ?? ch;

/** Dative / locative ending for feminine nouns in -a (Jana → Janě, Lenka → Lence, Petra → Petře). */
function feminineDative(stem: string): string {
  if (stem.endsWith('ch')) return `${stem.slice(0, -2)}še`;
  const last = stem.at(-1)!;
  const before = stem.slice(0, -1);
  switch (last) {
    case 'k':
      return `${before}ce`;
    case 'g':
    case 'h':
      return `${before}ze`;
    case 'r':
      return `${before}ře`;
    case 'd':
    case 't':
    case 'n':
    case 'b':
    case 'p':
    case 'v':
    case 'm':
    case 'f':
      return `${stem}ě`;
    default:
      return `${stem}e`;
  }
}

function inflectFeminine(word: string, c: Case, isSurname: boolean): string | undefined {
  if (c === 'nom') return word;
  if (/ová$/.test(word)) {
    const stem = word.slice(0, -1);
    return { dat: `${stem}é`, ins: `${stem}ou`, voc: word }[c];
  }
  if (/á$/.test(word)) {
    const stem = word.slice(0, -1);
    return { dat: `${stem}é`, ins: `${stem}ou`, voc: word }[c];
  }
  if (isSurname) return /í$|ů$/.test(word) ? word : undefined;
  if (/ie$/.test(word)) {
    const stem = word.slice(0, -1);
    return { dat: `${stem}i`, ins: `${stem}í`, voc: word }[c];
  }
  if (/a$/.test(word)) {
    const stem = word.slice(0, -1);
    return { dat: feminineDative(stem), ins: `${stem}ou`, voc: `${stem}o` }[c];
  }
  return undefined;
}

export interface Person {
  first: string;
  last: string;
  sex: Sex;
}

/** Declines a whole name; `undefined` if one of its parts does not fit a known paradigm. */
export function decline(p: Person, c: Case): { first: string; last: string } | undefined {
  const first = p.sex === 'M' ? inflectMasculine(p.first, c) : inflectFeminine(p.first, c, false);
  const last = p.sex === 'M' ? inflectMasculine(p.last, c) : inflectFeminine(p.last, c, true);
  return first && last ? { first, last } : undefined;
}

export function declineSurname(p: Person, c: Case): string | undefined {
  return p.sex === 'M' ? inflectMasculine(p.last, c) : inflectFeminine(p.last, c, true);
}

export function declineFirst(p: Person, c: Case): string | undefined {
  return p.sex === 'M' ? inflectMasculine(p.first, c) : inflectFeminine(p.first, c, false);
}
