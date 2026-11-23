/** Every kind of personal data the library detects. Order = display order. */
export const PII_TYPES = [
  'PERSON',
  'RODNE_CISLO',
  'ADDRESS',
  'PHONE',
  'EMAIL',
  'BANK_ACCOUNT',
  'IBAN',
  'ICO',
  'DIC',
  'ID_CARD',
  'PASSPORT',
  'PSC',
] as const;
export type PiiType = (typeof PII_TYPES)[number];

/**
 * Machine-readable reasons why a finding was reported (or how its score was adjusted).
 * The UI translates them; keep the list closed so translations can be checked for completeness.
 */
export const REASON_CODES = [
  'format',
  'checksum_mod11',
  'checksum_mod97',
  'valid_birth_date',
  'nine_digit_pre_1954',
  'remainder_10_exception',
  'supplementary_series',
  'slash_separator',
  'known_bank_code',
  'unknown_bank_code',
  'account_prefix',
  'cz_account_inside_iban',
  'dic_from_ico',
  'dic_from_rodne_cislo',
  'dic_special_699',
  'country_code',
  'grouped_digits',
  'context_keyword',
  'negative_context',
  'obfuscated_email',
  'first_name_dictionary',
  'inflected_form',
  'followed_by_surname',
  'honorific_or_title',
  'surname_suffix',
  'street_and_number',
  'postal_code_and_city',
  'ner_model',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export interface Finding {
  type: PiiType;
  /** UTF-16 offsets into the input text, `end` exclusive. */
  start: number;
  end: number;
  text: string;
  /** Confidence in [0, 1]. Findings below `minScore` are not reported. */
  score: number;
  /** Which detector produced it: `rules` (this library) or a plugin id such as `ner`. */
  detector: string;
  reasons: ReasonCode[];
}

/** A rule detector: synchronous, deterministic, no I/O. */
export type Detector = (text: string, ctx: DetectorContext) => Finding[];

/** A plugin detector, e.g. an ML model; may be asynchronous. */
export type AsyncDetector = (text: string) => Promise<Finding[]>;

export interface DetectorContext {
  /** Reference date for "birth date in the future" checks; injectable for deterministic tests. */
  today: Date;
}

export interface DetectOptions {
  /** Drop findings with a lower score. Default {@link DEFAULT_MIN_SCORE}. */
  minScore?: number;
  /** Only report these types. Default: all. */
  types?: readonly PiiType[];
  /** Reference date (default: now). */
  today?: Date;
}

export const DEFAULT_MIN_SCORE = 0.5;
