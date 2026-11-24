import { before, CONTEXT, finding, fold } from '../context.ts';
import type { Detector, Finding, ReasonCode } from '../types.ts';
import { isValidPsc } from '../validators/contact.ts';

/**
 * Heuristic: street (capitalised words, prepositions „Na", „U", „K"…, ordinals „28. Října",
 * abbreviations „Nám.") + house number (číslo popisné / orientační, e.g. „12", „1234/5a"),
 * optionally followed by PSČ and municipality. No street dictionary — the structure is the signal.
 */
const STREET_TOKEN = String.raw`(?:\p{Lu}\p{Ll}*\.?(?!\p{L})|\d{1,2}\.)`;
const STREET = String.raw`${STREET_TOKEN}(?: ?${STREET_TOKEN}){0,4}`;
const HOUSE_NUMBER = String.raw`\d{1,4}[a-z]?(?:/\d{1,4}[a-z]?)?`;
const CITY_WORD = String.raw`\p{Lu}\p{Ll}+(?:-\p{Lu}?\p{Ll}+)*`;
// Words of a municipality are separated by plain spaces only, so the match never runs into the
// next line („…Cvikov\nČíslo OP").
const CITY = String.raw`${CITY_WORD}(?: (?:nad|pod|v|ve|na|u) ${CITY_WORD}| ${CITY_WORD}){0,3}(?: \d{1,2}(?!\d))?(?: \(okres ${CITY_WORD}\))?`;

const ADDRESS = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(${STREET}) (${HOUSE_NUMBER})(?![\p{L}\p{N}/])` +
    String.raw`(?:(,?\s+)(\d{3} ?\d{2}) +(${CITY})|, *(${CITY}))?`,
  'gu',
);

// Village houses without a street: „Lhota č. p. 45, 538 21 Slatiňany".
const HOUSE_ONLY = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(?<base>${CITY},? č\. ?p\. ?\d{1,4})(?![\p{L}\p{N}/])` +
    String.raw`(?<postal>,?\s+(?<psc>\d{3} ?\d{2}) +${CITY})?`,
  'gu',
);

/** Words that start a sentence or introduce the address but are not part of the street name. */
const LEADING_NON_STREET = new Set(
  [
    'adresa',
    'bydliste',
    'bytem',
    'sidlo',
    'klient',
    'klientka',
    'pan',
    'pani',
    'ulice',
    'ul.',
    'trvale',
    'korespondencni',
    'dorucovaci',
    'kontaktni',
  ].map(fold),
);

/** Cities whose districts are written „Praha 5" — a district, not an address of a person. */
const DISTRICT_CITIES = new Set(
  [
    'Praha',
    'Praze',
    'Prahy',
    'Prahu',
    'Prahou',
    'Brno',
    'Brně',
    'Brna',
    'Ostrava',
    'Ostravě',
    'Ostravy',
    'Plzeň',
    'Plzni',
    'Plzně',
  ].map(fold),
);

export const detectAddress: Detector = (text) => {
  const out: Finding[] = [];
  for (const m of text.matchAll(ADDRESS)) {
    let start = m.index;
    let street = m[1]!;
    // Drop leading tokens such as „Bytem", „Klientka" that the greedy street pattern took.
    for (;;) {
      const first = /^(\S+)\s+/u.exec(street);
      if (!first || !LEADING_NON_STREET.has(fold(first[1]!))) break;
      street = street.slice(first[0].length);
      start += first[0].length;
    }
    const end = m.index + m[0].length;
    const hasPostal = m[4] !== undefined;
    const hasCity = hasPostal || m[6] !== undefined;
    const streetTokens = street.trim().split(/\s+/);

    const reasons: ReasonCode[] = ['street_and_number'];
    if (!hasPostal && streetTokens.length === 1 && DISTRICT_CITIES.has(fold(streetTokens[0]!))) {
      // „Praha 5", „v Brně 2" → a city district, not the address of a person.
      continue;
    }
    if (hasPostal && !isValidPsc(m[4]!)) continue;
    // „Fond Alfa 250 000 Kč": a number group right after the house number means an amount.
    if (!hasCity && /^\s?\d/.test(text.slice(end, end + 2))) continue;

    let score: number;
    if (hasPostal) {
      score = 0.9;
      reasons.push('postal_code_and_city');
    } else if (hasCity) {
      score = 0.7;
    } else {
      score = 0.35;
    }
    if (CONTEXT.ADDRESS!.test(before(text, start, 30))) {
      score += hasPostal ? 0.05 : 0.4;
      reasons.push('context_keyword');
    }
    out.push(finding('ADDRESS', text, start, end, score, reasons));
  }
  for (const m of text.matchAll(HOUSE_ONLY)) {
    const { base = '', postal, psc } = m.groups ?? {};
    const hasPostal = postal !== undefined && psc !== undefined && isValidPsc(psc);
    const end = m.index + base.length + (hasPostal ? postal.length : 0);
    const reasons: ReasonCode[] = ['street_and_number'];
    if (hasPostal) reasons.push('postal_code_and_city');
    let score = hasPostal ? 0.85 : 0.5;
    if (CONTEXT.ADDRESS!.test(before(text, m.index, 30))) {
      score += 0.1;
      reasons.push('context_keyword');
    }
    out.push(finding('ADDRESS', text, m.index, end, score, reasons));
  }
  return out;
};
