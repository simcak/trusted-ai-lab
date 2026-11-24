import { normalize } from '../tools/search-funds.ts';

/**
 * Content policy: the assistant compares facts but never recommends what to buy.
 * Heuristics on lower-case text without diacritics, deliberately narrow so that factual questions
 * („který fond má nejnižší poplatky“) pass. The system prompt says the same thing; this layer makes
 * the rule hold even when the model does not follow the prompt.
 */
const ADVICE_REQUEST = [
  /\b(ktery|jaky|co|kam)\b.{0,40}\b(mam|mel bych|mela bych|bych mel|bych mela|byste|doporucujete|doporucite|radite)\b.{0,40}\b(koupit|vybrat|zvolit|investovat|vlozit|dat)\b/,
  /\b(doporuc\w*|porad\w*)\b.{0,15}\b(mi|nam)\b.{0,30}\b(fond\w*|investic\w*|kam|co koupit)\b/,
  /\b(nejlepsi|nejvyhodnejsi|nejvynosnejsi)\b.{0,40}\b(koupit|investovat|pro mne|pro me|pro nas)\b/,
  /\b(vyplati se|stoji za to)\b.{0,30}\b(koupit|investovat)\b/,
  /\b(which|what)\b.{0,30}\b(fund|should i)\b.{0,30}\b(buy|invest)\b/,
];

const ADVICE_ANSWER = [
  /\b(doporucuji|doporucil bych|doporucila bych|radil bych|radila bych|radim vam)\b.{0,60}\b(koupit|investovat|zvolit|vybrat|fond\w*)\b/,
  /\bmel(a)? byste\b.{0,30}\b(koupit|investovat|zvolit|vybrat)\b/,
  /\bnejlepsi volb\w* (je|bude|pro vas)\b/,
];

const test = (patterns: readonly RegExp[], text: string) => {
  const normalized = normalize(text).replace(/\s+/g, ' ');
  return patterns.some((p) => p.test(normalized));
};

export const isAdviceRequest = (text: string): boolean => test(ADVICE_REQUEST, text);
export const isAdviceAnswer = (text: string): boolean => test(ADVICE_ANSWER, text);
