/**
 * Sources the rules cite. Every URL below was opened on 2026-11-24 unless marked TODO(verify).
 *
 * AI Act article pages: European Commission AI Act Service Desk, which renders the consolidated
 * text "as at 27 July 2026" (i.e. including the Digital Omnibus, Regulation (EU) 2026/1744).
 * EUR-Lex itself does not answer automated requests, see docs/OPEN_QUESTIONS.md OQ-17.
 */

export interface Reference {
  /** Czech label shown next to the rule, e.g. „AI Act, čl. 50 odst. 1“. */
  label: string;
  url?: string;
}

const SERVICE_DESK = 'https://ai-act-service-desk.ec.europa.eu/en/ai-act';

export function aiAct(label: string, page: string): Reference {
  return { label: `AI Act, ${label}`, url: `${SERVICE_DESK}/${page}` };
}

/**
 * TODO(verify) OQ-21: GDPR article numbers are cited without a machine-read copy of the text
 * (EUR-Lex refuses automated requests). The link is the official consolidated text.
 */
export function gdpr(label: string): Reference {
  return { label: `GDPR, ${label}`, url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj' };
}

/** OWASP Top 10 for LLM Applications, 2026 edition (current as of 2026-11-24). */
export function owasp(id: string, name: string): Reference {
  return {
    label: `OWASP Top 10 for LLM Applications, ${id} ${name}`,
    url: 'https://genai.owasp.org/top-10-for-llm-applications-2026/',
  };
}

export const RULES_OF_ML: Reference = {
  label: 'Google, Rules of Machine Learning, Rule #1',
  url: 'https://developers.google.com/machine-learning/guides/rules-of-ml',
};

/** Design principles of this demo, explained in the rule rationale (no external source). */
export function principle(label: string): Reference {
  return { label: `Zásada návrhu: ${label}` };
}
