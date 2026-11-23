import { personKey } from './names/person.ts';
import { normalizeIban } from './validators/iban.ts';
import type { Finding, PiiType } from './types.ts';

/** Placeholder labels (Czech, as the redacted text goes to a Czech-speaking model). */
export const PLACEHOLDER_LABELS: Readonly<Record<PiiType, string>> = {
  PERSON: 'OSOBA',
  RODNE_CISLO: 'RODNÉ_ČÍSLO',
  ADDRESS: 'ADRESA',
  PHONE: 'TELEFON',
  EMAIL: 'E-MAIL',
  BANK_ACCOUNT: 'ČÍSLO_ÚČTU',
  IBAN: 'IBAN',
  ICO: 'IČO',
  DIC: 'DIČ',
  ID_CARD: 'ČÍSLO_OP',
  PASSPORT: 'ČÍSLO_PASU',
  PSC: 'PSČ',
};

const LABEL_TO_TYPE = new Map<string, PiiType>(
  Object.entries(PLACEHOLDER_LABELS).map(([type, label]) => [label, type as PiiType]),
);

/** Matches `<OSOBA_1>`, `<RODNÉ_ČÍSLO_2>`… */
const PLACEHOLDER = /<(\p{Lu}[\p{Lu}_-]*)_(\d+)>/gu;

export interface Replacement {
  start: number;
  end: number;
  type: PiiType;
  original: string;
  replacement: string;
}

function apply(text: string, replacements: readonly Replacement[]): string {
  let out = '';
  let cursor = 0;
  for (const r of [...replacements].sort((a, b) => a.start - b.start)) {
    if (r.start < cursor) throw new Error('Overlapping findings — run resolveOverlaps() first');
    out += text.slice(cursor, r.start) + r.replacement;
    cursor = r.end;
  }
  return out + text.slice(cursor);
}

/** Mode `redact`: every finding becomes `[TYPE]`; nothing can be restored. */
export function redact(text: string, findings: readonly Finding[]): string {
  return apply(
    text,
    findings.map((f) => ({
      start: f.start,
      end: f.end,
      type: f.type,
      original: f.text,
      replacement: `[${PLACEHOLDER_LABELS[f.type]}]`,
    })),
  );
}

export interface PseudonymEntry {
  placeholder: string;
  type: PiiType;
  /** First surface form seen; used when re-identifying. */
  original: string;
}

export interface PseudonymizeResult {
  text: string;
  replacements: Replacement[];
}

export interface ReidentifyResult {
  text: string;
  /** Number of placeholders replaced by the original value. */
  restored: number;
  /** Placeholders in the text that this session never issued (e.g. invented by the model). */
  unknown: string[];
}

/**
 * Mode `reversible`: a session that keeps the placeholder → value map **only in this closure**.
 * Nothing is persisted or serialised; drop the object (or call `clear()`) to forget the mapping.
 */
export interface Pseudonymizer {
  pseudonymize(text: string, findings: readonly Finding[]): PseudonymizeResult;
  reidentify(text: string): ReidentifyResult;
  /** Read-only view of the mapping, e.g. to show it in the UI. */
  entries(): readonly PseudonymEntry[];
  clear(): void;
}

interface PersonEntry extends PseudonymEntry {
  first?: string;
  surname?: string;
}

/** Normalised value used to give the same value the same placeholder. */
function valueKey(f: Finding): string {
  switch (f.type) {
    case 'EMAIL':
      return f.text.toLowerCase();
    case 'IBAN':
      return normalizeIban(f.text);
    case 'ADDRESS':
      return f.text.replace(/\s+/g, ' ').toLocaleLowerCase('cs');
    default:
      return f.text.replace(/[\s/.()+-]/g, '').replace(/^00420|^420(?=\d{9}$)/, '');
  }
}

export function createPseudonymizer(): Pseudonymizer {
  const byKey = new Map<string, PseudonymEntry>();
  const persons: PersonEntry[] = [];
  const byPlaceholder = new Map<string, PseudonymEntry>();
  const counters = new Map<PiiType, number>();
  // Placeholder-like strings already present in the input are never issued, so they cannot be
  // "restored" into a real value later.
  const reserved = new Set<string>();

  const issue = (type: PiiType, original: string): PseudonymEntry => {
    const label = PLACEHOLDER_LABELS[type];
    let n = counters.get(type) ?? 0;
    let placeholder: string;
    do {
      n += 1;
      placeholder = `<${label}_${n}>`;
    } while (reserved.has(placeholder));
    counters.set(type, n);
    const entry = { placeholder, type, original };
    byPlaceholder.set(placeholder, entry);
    return entry;
  };

  const personEntry = (f: Finding): PseudonymEntry => {
    const key = personKey(f.text);
    const sameSurname = key.surname ? persons.filter((p) => p.surname === key.surname) : [];
    const sameFirst = key.first ? persons.filter((p) => p.first === key.first) : [];
    let match: PersonEntry | undefined;
    if (key.first && key.surname) {
      match =
        sameSurname.find((p) => p.first === key.first) ??
        // „pan Novák" seen before „Jan Novák": upgrade the surname-only entry.
        (sameSurname.length === 1 && sameSurname[0]!.first === undefined
          ? sameSurname[0]
          : undefined);
      if (match && !match.first) match.first = key.first;
    } else if (key.surname) {
      match = sameSurname.length === 1 ? sameSurname[0] : undefined;
    } else if (key.first) {
      match = sameFirst.length === 1 ? sameFirst[0] : undefined;
    }
    if (match) return match;
    const entry: PersonEntry = { ...issue('PERSON', f.text), ...key };
    persons.push(entry);
    return entry;
  };

  return {
    pseudonymize(text, findings) {
      for (const m of text.matchAll(PLACEHOLDER)) reserved.add(m[0]);
      const replacements = findings.map((f) => {
        let entry: PseudonymEntry;
        if (f.type === 'PERSON') {
          entry = personEntry(f);
        } else {
          const key = `${f.type}:${valueKey(f)}`;
          entry = byKey.get(key) ?? issue(f.type, f.text);
          byKey.set(key, entry);
        }
        return {
          start: f.start,
          end: f.end,
          type: f.type,
          original: f.text,
          replacement: entry.placeholder,
        };
      });
      return { text: apply(text, replacements), replacements };
    },

    reidentify(text) {
      let restored = 0;
      const unknown: string[] = [];
      const out = text.replace(PLACEHOLDER, (placeholder: string, label: string) => {
        const entry = byPlaceholder.get(placeholder);
        if (!entry) {
          if (LABEL_TO_TYPE.has(label)) unknown.push(placeholder);
          return placeholder;
        }
        restored += 1;
        return entry.original;
      });
      return { text: out, restored, unknown };
    },

    entries: () =>
      [...byPlaceholder.values()].map(({ placeholder, type, original }) => ({
        placeholder,
        type,
        original,
      })),

    clear() {
      byKey.clear();
      persons.length = 0;
      byPlaceholder.clear();
      counters.clear();
      reserved.clear();
    },
  };
}

/** Mode `pseudonymize`: consistent placeholders within one text; the mapping is discarded. */
export function pseudonymize(text: string, findings: readonly Finding[]): PseudonymizeResult {
  return createPseudonymizer().pseudonymize(text, findings);
}

export const MODES = ['redact', 'pseudonymize', 'reversible'] as const;
export type Mode = (typeof MODES)[number];
