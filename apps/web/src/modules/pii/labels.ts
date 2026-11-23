import type { Finding, PiiType } from '@trusted-ai-lab/pii-cz';
import { cs } from '../../i18n/cs.ts';

/** Colour groups for highlights; text labels carry the meaning, colour is only a hint. */
export const TYPE_CATEGORY: Record<PiiType, 'identity' | 'number' | 'finance' | 'contact'> = {
  PERSON: 'identity',
  RODNE_CISLO: 'number',
  ICO: 'number',
  DIC: 'number',
  ID_CARD: 'number',
  PASSPORT: 'number',
  BANK_ACCOUNT: 'finance',
  IBAN: 'finance',
  PHONE: 'contact',
  EMAIL: 'contact',
  ADDRESS: 'contact',
  PSC: 'contact',
};

export const reasonsText = (f: Finding) => f.reasons.map((r) => cs.pii.reasons[r]).join(', ');
