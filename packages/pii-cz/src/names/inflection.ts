/**
 * Minimal Czech name morphology: enough to map declined forms back to a dictionary entry
 * („Janu Novákovi" → jan, „s Petrem" → petr, „Lence" → lenka) and to build a stable key for
 * consistent pseudonyms. Not a full lemmatiser — rules cover the common name paradigms only.
 */

const CASE_ENDINGS = [
  'ovou',
  'ovi',
  'ího',
  'ímu',
  'ého',
  'ému',
  'ové',
  'ou',
  'em',
  'ím',
  'ým',
  'mu',
  'ho',
  'ě',
  'e',
  'u',
  'y',
  'i',
  'í',
  'o',
  'a',
  'm',
] as const;

const VOWELS = 'aeiouyáéěíóúůý';

/** Candidate nominative forms of a (lower-case) first name. Always includes the input itself. */
export function firstNameCandidates(word: string): string[] {
  const out = new Set<string>([word]);
  for (const ending of CASE_ENDINGS) {
    if (!word.endsWith(ending) || word.length - ending.length < 2) continue;
    const stem = word.slice(0, -ending.length);
    out.add(stem);
    out.add(`${stem}a`);
    out.add(`${stem}e`);
    if (ending.startsWith('í') || ending === 'mu' || ending === 'ho' || ending === 'm') {
      out.add(`${stem}í`);
    }
    const last = stem.at(-1) ?? '';
    const beforeLast = stem.at(-2) ?? '';
    // Consonant alternations in the dative / locative / vocative.
    if (last === 'c') out.add(`${stem.slice(0, -1)}ka`); // Lence → Lenka
    if (last === 'ř') {
      out.add(`${stem.slice(0, -1)}r`); // Petře → Petr
      out.add(`${stem.slice(0, -1)}ra`); // Petře → Petra
    }
    if (last === 'z') {
      out.add(`${stem.slice(0, -1)}ha`);
      out.add(`${stem.slice(0, -1)}ga`); // Olze → Olga
    }
    // Mobile e: Pavl → Pavel, Mark → Marek, Hynk → Hynek, Zdeňk → Zdeněk.
    if ('klc'.includes(last) && beforeLast && !VOWELS.includes(beforeLast)) {
      if (beforeLast === 'ň') out.add(`${stem.slice(0, -2)}něk`);
      else out.add(`${stem.slice(0, -1)}e${last}`);
    }
  }
  return [...out];
}

/**
 * Stable key for a surname regardless of case: Novák / Nováka / Novákovi / Novákem → novák;
 * Nováková / Novákové / Novákovou → nováková; Černý / Černému → černý; Svoboda / Svobodou → svobod.
 * Masculine and feminine forms intentionally get different keys (they are different people).
 */
export function surnameKey(surname: string): string {
  const w = surname.toLocaleLowerCase('cs');
  const feminine = /^(.{2,})(?:ová|ové|ovou)$/u.exec(w);
  if (feminine) return `${feminine[1]}ová`;
  const adjective = /^(.{2,})(?:ý|ého|ému|ým|ém)$/u.exec(w);
  if (adjective) return `${adjective[1]}ý`;
  for (const ending of ['ovi', 'em', 'ou', 'ě', 'e', 'u', 'y', 'i', 'a', 'á', 'é', 'o']) {
    if (w.endsWith(ending) && w.length - ending.length >= 2) {
      return dropMobileE(w.slice(0, -ending.length));
    }
  }
  return dropMobileE(w);
}

/** Hájek / Hájka → hájk, Němec / Němce → němc: normalise the mobile e so both forms match. */
function dropMobileE(stem: string): string {
  return stem.replace(/(?<=[^aeiouyáéěíóúůý])[eě]([kcl])$/u, '$1');
}
