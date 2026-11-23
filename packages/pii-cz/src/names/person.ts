import { finding, fold } from '../context.ts';
import type { Detector, Finding, ReasonCode } from '../types.ts';
import { matchFirstName } from './dictionary.ts';
import { surnameKey } from './inflection.ts';

/**
 * Person names without a surname dictionary (no open, licensed Czech surname list exists):
 *  A. first name from the MV list (also declined) + adjacent capitalised word(s)  → 0.85
 *  B. honorific or academic title („pan", „paní", „Vážená", „klientka", „Ing.") + name → 0.85
 *  C. capitalised word with the feminine surname suffix -ová / -ové / -ovou          → 0.6
 *     (with a capitalised word before it → 0.7)
 *  D. first name alone, not at the start of a sentence                                → 0.55
 *  E. two capitalised words in the male dative -ovi                                   → 0.65
 *  S. a signature line: 2–3 capitalised words alone on a line / after „Děkuji,"       → 0.7
 * Surnames equal to ordinary words („Nový", „Král") are found only through A or B.
 */

interface Token {
  value: string;
  start: number;
  end: number;
  folded: string;
  cap: boolean;
}

const TOKEN = /\p{L}+(?:[-'’]\p{L}+)*/gu;

const HONORIFICS = new Set(
  [
    'pan',
    'pana',
    'panu',
    'pane',
    'panem',
    'paní',
    'slečna',
    'slečny',
    'slečně',
    'slečnu',
    'slečno',
    'slečnou',
    'vážený',
    'vážená',
    'vážení',
    'vážené',
    'milý',
    'milá',
    'klient',
    'klienta',
    'klientovi',
    'klientem',
    'kliente',
    'klientka',
    'klientky',
    'klientce',
    'klientku',
    'klientko',
    'klientkou',
    'zákazník',
    'zákazníka',
    'zákazníkovi',
    'zákazníkem',
    'zákaznice',
    'zákaznici',
    'zákaznicí',
    'kolega',
    'kolegy',
    'kolegovi',
    'kolegou',
    'kolegyně',
    'kolegyni',
    'kolegyní',
    'manžel',
    'manžela',
    'manželovi',
    'manželem',
    'manželka',
    'manželky',
    'manželce',
    'manželkou',
    'zmocněnec',
    'zmocněnce',
    'zmocněnkyně',
    // Role nouns that commonly precede a name in client communication.
    'zástupce',
    'zástupci',
    'zástupcem',
    'zástupkyně',
    'osoba',
    'osoby',
    'osobě',
    'osobou',
    'dítě',
    'dítěte',
    'dítěti',
    'syn',
    'syna',
    'synovi',
    'dcera',
    'dcery',
    'dceři',
    'podnikatel',
    'podnikatele',
    'podnikatelka',
    'majitel',
    'majitele',
    'majitelka',
    'dlužník',
    'dlužnice',
    'ručitel',
    'ručitelka',
    'poradce',
    'poradkyně',
    'jméno',
    'jménem',
  ].map(fold),
);

/** Academic titles and abbreviations, recognised only when followed by a dot. */
const TITLES = new Set(
  [
    'ing',
    'mgr',
    'bc',
    'mudr',
    'judr',
    'phdr',
    'rndr',
    'paeddr',
    'mvdr',
    'doc',
    'prof',
    'dr',
    'p',
  ].map(fold),
);

/** Capitalised words that are never a surname next to a first name / honorific. */
const NOT_SURNAME = new Set(
  [
    'Praha',
    'Praze',
    'Prahy',
    'Brno',
    'Brně',
    'Ostrava',
    'Ostravě',
    'Plzeň',
    'Česká',
    'České',
    'Český',
    'Českou',
    'Komerční',
    'Spořitelna',
    'Spořitelny',
    'Banka',
    'Banky',
    'Fond',
    'Fondu',
    'Fondy',
    'Fondem',
    'Alfa',
    'Beta',
    'Gama',
    'Delta',
    'Omega',
    'Sigma',
    'Plus',
    'Invest',
    'Group',
    'Pojišťovna',
    'Pojišťovny',
    'Dobrý',
    'Dobrá',
    'Děkuji',
    'Děkujeme',
    'Dne',
    'Datum',
    // Formal pronouns, capitalised in Czech letters („Jak Vám mohu pomoci").
    'Vám',
    'Vás',
    'Vámi',
    'Váš',
    'Vaše',
    'Vaši',
    'Vaší',
    'Vašeho',
    'Vašemu',
    'Vaším',
    'Vašich',
    'Tě',
    'Ti',
    'Tebe',
  ].map(fold),
);

function tokenize(text: string): Token[] {
  return [...text.matchAll(TOKEN)].map((m) => ({
    value: m[0],
    start: m.index,
    end: m.index + m[0].length,
    folded: fold(m[0]),
    cap: /^\p{Lu}\p{Ll}/u.test(m[0]),
  }));
}

const isTitle = (text: string, t: Token) => TITLES.has(t.folded) && text[t.end] === '.';

/** True for honorifics („paní", „pane") and title words („Ing") — used to trim NER spans. */
export function isHonorificOrTitleWord(word: string): boolean {
  const folded = fold(word);
  return HONORIFICS.has(folded) || TITLES.has(folded);
}
const isHonorific = (text: string, t: Token) => HONORIFICS.has(t.folded) || isTitle(text, t);

function adjacent(text: string, a: Token, b: Token): boolean {
  const gap = text.slice(a.end, b.start);
  return /^[ \u00A0]$/.test(gap) || (isTitle(text, a) && /^\.[ \u00A0]?$/.test(gap));
}

function sentenceStart(text: string, tokens: Token[], i: number): boolean {
  const token = tokens[i]!;
  const prefix = text.slice(0, token.start).replace(/[ \t\u00A0„"'(]+$/u, '');
  if (prefix === '') return true;
  const last = prefix.at(-1)!;
  if (last === '\n' || last === '!' || last === '?') return true;
  if (last === '.') {
    const prev = tokens[i - 1];
    // „Ing. Jan" — the dot belongs to a title, not to the end of a sentence.
    return !(prev && isTitle(text, prev) && prev.end === prefix.length - 1);
  }
  return false;
}

const surnameLike = (t: Token | undefined): t is Token =>
  t !== undefined && t.cap && t.value.length >= 2 && !NOT_SURNAME.has(t.folded);

const FEMININE_SURNAME = /^\p{Lu}\p{Ll}{2,}(?:ová|ové|ovou)$/u;

/**
 * If tokens i… are 2–3 adjacent capitalised words that start a line (or follow „Děkuji," /
 * „S pozdravem,") and end it, returns the index of the last one.
 */
function signatureLine(text: string, tokens: Token[], i: number): number | undefined {
  const lineBefore = text.slice(text.lastIndexOf('\n', tokens[i]!.start - 1) + 1, tokens[i]!.start);
  if (
    !/^\s*$/.test(lineBefore) &&
    !/(?:děkuji|děkuji vám|s pozdravem|zdraví)[,.]?\s*$/iu.test(lineBefore)
  ) {
    return undefined;
  }
  let last = i;
  while (
    last - i < 2 &&
    surnameLike(tokens[last + 1]) &&
    adjacent(text, tokens[last]!, tokens[last + 1]!)
  ) {
    last++;
  }
  if (last === i || !surnameLike(tokens[i])) return undefined;
  const end = tokens[last]!.end;
  const lineEnd = text.indexOf('\n', end);
  const rest = text.slice(end, lineEnd === -1 ? undefined : lineEnd);
  return /^[\s.,!]*$/.test(rest) ? last : undefined;
}

export const detectPerson: Detector = (text) => {
  const tokens = tokenize(text);
  const out: Finding[] = [];
  const covered = new Set<number>();

  const emit = (from: number, to: number, score: number, reasons: ReasonCode[]) => {
    out.push(finding('PERSON', text, tokens[from]!.start, tokens[to]!.end, score, reasons));
    for (let k = from; k <= to; k++) covered.add(k);
  };

  /** From token i (a first name), how far does the name continue? Returns the last index. */
  const extendName = (i: number): number => {
    const next = tokens[i + 1];
    if (!surnameLike(next) || !adjacent(text, tokens[i]!, next)) return i;
    const third = tokens[i + 2];
    // „Jana Marie Nováková": two first names followed by a surname.
    if (matchFirstName(next.value) && surnameLike(third) && adjacent(text, next, third)) {
      return i + 2;
    }
    return i + 1;
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;

    // B. honorific / title chain → the following capitalised word(s).
    if (isHonorific(text, token)) {
      let k = i;
      while (
        k + 1 < tokens.length &&
        isHonorific(text, tokens[k + 1]!) &&
        adjacent(text, tokens[k]!, tokens[k + 1]!)
      ) {
        k++;
      }
      const name = tokens[k + 1];
      if (surnameLike(name) && adjacent(text, tokens[k]!, name)) {
        const first = matchFirstName(name.value);
        const following = tokens[k + 2];
        // Without a dictionary match, two adjacent capitalised words after an honorific are
        // still taken as first name + surname („Klient Teobald Brázda").
        const last = first
          ? extendName(k + 1)
          : surnameLike(following) && adjacent(text, name, following)
            ? k + 2
            : k + 1;
        const reasons: ReasonCode[] = ['honorific_or_title'];
        if (first) reasons.push('first_name_dictionary');
        if (last > k + 1) reasons.push('followed_by_surname');
        emit(k + 1, last, 0.85, reasons);
        i = last;
        continue;
      }
    }

    if (!token.cap || covered.has(i)) continue;
    const first = matchFirstName(token.value);

    // A. first name + surname.
    if (first) {
      const last = extendName(i);
      if (last > i) {
        const reasons: ReasonCode[] = ['first_name_dictionary', 'followed_by_surname'];
        if (first.inflected) reasons.push('inflected_form');
        emit(i, last, 0.85, reasons);
        i = last;
        continue;
      }
    }

    const atStart = sentenceStart(text, tokens, i);

    // S. signature: two or three capitalised words that close a line or the text
    // („S pozdravem\nAlbertýna Majerová", „Děkuji, Jozue Poláček").
    const signatureEnd = signatureLine(text, tokens, i);
    if (signatureEnd !== undefined) {
      const reasons: ReasonCode[] = ['followed_by_surname'];
      if (first) reasons.push('first_name_dictionary');
      emit(i, signatureEnd, 0.7, reasons);
      i = signatureEnd;
      continue;
    }

    // C. feminine surname suffix; a capitalised word right before it is taken as the first name
    // („Kontaktní osoba Ignácie Antošová") unless it only starts the sentence („Dnes Nováková…").
    if (FEMININE_SURNAME.test(token.value) && !first) {
      const prev = tokens[i - 1];
      const prevIsFirstName =
        prev !== undefined &&
        !covered.has(i - 1) &&
        surnameLike(prev) &&
        adjacent(text, prev, token) &&
        (matchFirstName(prev.value) !== undefined || !sentenceStart(text, tokens, i - 1));
      if (prevIsFirstName) {
        emit(i - 1, i, 0.7, ['surname_suffix', 'followed_by_surname']);
      } else {
        emit(i, i, atStart ? 0.45 : 0.6, ['surname_suffix']);
      }
      continue;
    }

    // E. two adjacent capitalised words in the male dative („zavolat Drahutinovi Truhlářovi").
    const next = tokens[i + 1];
    if (
      !atStart &&
      /ovi$/u.test(token.value) &&
      surnameLike(next) &&
      /ovi$/u.test(next.value) &&
      adjacent(text, token, next)
    ) {
      emit(i, i + 1, 0.65, ['surname_suffix', 'followed_by_surname']);
      i += 1;
      continue;
    }

    // D. first name alone.
    if (first) {
      const reasons: ReasonCode[] = ['first_name_dictionary'];
      if (first.inflected) reasons.push('inflected_form');
      emit(i, i, atStart ? 0.4 : first.inflected ? 0.5 : 0.55, reasons);
    }
  }
  return out;
};

export interface PersonKey {
  first?: string;
  surname?: string;
}

/** Splits a PERSON finding into a first-name lemma and a surname key for consistent pseudonyms. */
export function personKey(value: string): PersonKey {
  const words = [...value.matchAll(TOKEN)].map((m) => m[0]);
  if (words.length === 0) return {};
  const firstMatch = matchFirstName(words[0]!);
  if (words.length === 1) {
    return firstMatch ? { first: firstMatch.lemma } : { surname: surnameKey(words[0]!) };
  }
  return {
    ...(firstMatch ? { first: firstMatch.lemma } : {}),
    surname: surnameKey(words.at(-1)!),
  };
}
