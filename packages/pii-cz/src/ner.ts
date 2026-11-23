import { clampScore, fold } from './context.ts';
import { isHonorificOrTitleWord } from './names/person.ts';
import type { AsyncDetector, Finding } from './types.ts';

/**
 * Optional NER plugin. The library never imports an ML runtime: the caller injects a token
 * classifier with the shape of a transformers.js `token-classification` pipeline output.
 * Only person entities (PER) are used — locations and organisations are not personal data here,
 * and addresses are handled by the rule detector.
 */
export interface NerToken {
  /** BIO label, e.g. `B-PER`, `I-PER`. */
  entity: string;
  score: number;
  /** Position in the model's token sequence (used to tell adjacent tokens apart). */
  index: number;
  /** Token text as the tokenizer sees it: often lower-cased, `##` marks a word-piece continuation. */
  word: string;
  /** Character offsets, if the runtime provides them (transformers.js 4.3 does not). */
  start?: number | null;
  end?: number | null;
}

export type TokenClassifier = (text: string) => Promise<readonly NerToken[]>;

export interface NerDetectorOptions {
  /** Entity tokens below this score are ignored. Default 0.5. */
  minTokenScore?: number;
  /**
   * The model's confidence is multiplied by this factor, so that on an identical span a
   * checksum-backed rule finding stays at least as strong. Default 0.8.
   */
  weight?: number;
  /** Detector id used in findings. Default `ner`. */
  id?: string;
}

interface Aligned {
  token: NerToken;
  label: string;
  start: number;
  end: number;
}

/** Folds each UTF-16 unit separately, so offsets in the result equal offsets in the input. */
function foldPerChar(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const folded = fold(text[i]!);
    out += folded.length === 1 ? folded : '\u0000';
  }
  return out;
}

/** Locates model tokens in the original text (case- and diacritics-insensitive). */
export function alignTokens(text: string, tokens: readonly NerToken[]): Aligned[] {
  const folded = foldPerChar(text);
  const aligned: Aligned[] = [];
  let cursor = 0;
  for (const token of tokens) {
    const label = token.entity.replace(/^[BI]-/, '');
    if (typeof token.start === 'number' && typeof token.end === 'number') {
      aligned.push({ token, label, start: token.start, end: token.end });
      cursor = token.end;
      continue;
    }
    const piece = fold(token.word.replace(/^##/, ''));
    if (piece === '' || piece === '[unk]') continue;
    const at = folded.indexOf(piece, cursor);
    if (at === -1) continue;
    aligned.push({ token, label, start: at, end: at + piece.length });
    cursor = at + piece.length;
  }
  return aligned;
}

const isLetter = (ch: string | undefined) => ch !== undefined && /\p{L}/u.test(ch);

export function createNerDetector(
  classify: TokenClassifier,
  options: NerDetectorOptions = {},
): AsyncDetector {
  const minTokenScore = options.minTokenScore ?? 0.5;
  const weight = options.weight ?? 0.8;
  const id = options.id ?? 'ner';

  return async (text) => {
    const tokens = (await classify(text)).filter(
      (t) => t.score >= minTokenScore && /^[BI]-PER$/.test(t.entity),
    );
    const aligned = alignTokens(text, tokens);

    // Group: a new entity starts at B-, or when the token is not adjacent to the previous one.
    const groups: Aligned[][] = [];
    for (const a of aligned) {
      const current = groups.at(-1);
      const prev = current?.at(-1);
      const continues =
        prev !== undefined &&
        a.token.index === prev.token.index + 1 &&
        (a.token.entity.startsWith('I-') || a.token.word.startsWith('##'));
      if (continues) current!.push(a);
      else groups.push([a]);
    }

    const findings: Finding[] = [];
    for (const group of groups) {
      let start = group[0]!.start;
      let end = group.at(-1)!.end;
      // Word pieces may cover only part of a word: extend to whole words.
      while (isLetter(text[start - 1])) start--;
      while (isLetter(text[end])) end++;
      // Trim honorifics / titles the model includes („paní Nováková", „Ing. Jiří …").
      for (;;) {
        const word = /^(\p{L}+)\.?\s+/u.exec(text.slice(start, end));
        if (!word || !isHonorificOrTitleWord(word[1]!)) break;
        start += word[0].length;
      }
      while (end > start && /[\s.,;:]/.test(text[end - 1]!)) end--;
      if (end - start < 2 || !/\p{Lu}/u.test(text[start]!)) continue;
      if (isHonorificOrTitleWord(text.slice(start, end))) continue; // a lone „Ing" / „paní"
      const mean = group.reduce((sum, a) => sum + a.token.score, 0) / group.length;
      findings.push({
        type: 'PERSON',
        start,
        end,
        text: text.slice(start, end),
        score: clampScore(mean * weight),
        detector: id,
        reasons: ['ner_model'],
      });
    }
    return findings;
  };
}
