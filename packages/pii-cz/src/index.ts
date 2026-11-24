/**
 * pii-cz — detection and pseudonymisation of Czech personal data.
 *
 *   const findings = detect(text);
 *   redact(text, findings);                 // „[RODNÉ_ČÍSLO]"
 *   pseudonymize(text, findings);           // „<OSOBA_1>", consistent within the text
 *   const session = createPseudonymizer();  // reversible: map kept in memory only
 *   session.reidentify(modelAnswer);
 */
export * from './types.ts';
export { detect, detectAsync, detectCandidates, mergeFindings, RULE_DETECTORS } from './detect.ts';
export { resolveOverlaps } from './resolve.ts';
export {
  createPseudonymizer,
  MODES,
  PLACEHOLDER_LABELS,
  pseudonymize,
  redact,
  type Mode,
  type PseudonymEntry,
  type PseudonymizeResult,
  type Pseudonymizer,
  type Replacement,
  type ReidentifyResult,
} from './modes.ts';
export {
  alignTokens,
  createNerDetector,
  type NerDetectorOptions,
  type NerToken,
  type TokenClassifier,
} from './ner.ts';
export { FIRST_NAMES_META, matchFirstName, type FirstNameMatch } from './names/dictionary.ts';
export { firstNameCandidates, surnameKey } from './names/inflection.ts';
export { personKey } from './names/person.ts';
export {
  parseRodneCislo,
  isValidRodneCislo,
  type RodneCisloResult,
} from './validators/rodne-cislo.ts';
export { isValidIco } from './validators/ico.ts';
export { parseDic, isValidDic } from './validators/dic.ts';
export {
  BANK_CODES_META,
  bankName,
  isValidBankAccount,
  parseBankAccount,
} from './validators/bank-account.ts';
export { isValidIban, parseIban } from './validators/iban.ts';
export {
  deobfuscateEmail,
  isValidEmail,
  isValidIdCardNumber,
  isValidPassportNumber,
  isValidPhone,
  isValidPsc,
  parsePhone,
} from './validators/contact.ts';

export const VERSION = '0.1.0';
