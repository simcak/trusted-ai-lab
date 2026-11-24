import { normalize } from '../tools/search-funds.ts';

/**
 * Heuristic prompt-injection patterns for text that comes from tools (untrusted content).
 * Matched on lower-case text without diacritics. A heuristic, not a guarantee: it catches the
 * obvious cases, the approval gate and the tool allowlist are the layers that do not depend on it.
 */
export const INJECTION_PATTERNS = {
  'ignore-instructions':
    /\b(ignoruj\w*|zapomen\w*|ignore|disregard|forget)\b.{0,40}\b(pokyn\w*|instrukc\w*|instructions?|prompt\w*|pravidl\w*|rules?)\b/,
  'role-override':
    /\b(jsi nyni|ted jsi|od ted jsi|you are now|rezimu? spravce|admin mode|developer mode|systemova zprava|system message|system prompt)\b/,
  'hidden-instruction':
    /\b(pokyny? pro (ai|asistent\w*|model\w*)|instructions? for the (ai|assistant|model)|(uzivatel\w*|klient\w*) o (tom|tomto pokynu) (nerikej|nesdeluj|nepis)|do not tell the user)\b/,
  'tool-directive':
    /\b(draft_email|search_funds|calculate_fees)\b|\b(zavolej|pouzij|spust|call|invoke|use)\b.{0,20}\b(nastroj\w*|funkc\w*|tool|function)\b/,
  'mass-action': /\b(vsem|all|every) (klientum|klienty|clients|customers|zakaznikum)\b/,
} as const satisfies Record<string, RegExp>;

export type InjectionPattern = keyof typeof INJECTION_PATTERNS;

/** Ids of the patterns found in `text` (empty = nothing suspicious). */
export function detectInjection(text: string): InjectionPattern[] {
  const normalized = normalize(text).replace(/\s+/g, ' ');
  return (Object.keys(INJECTION_PATTERNS) as InjectionPattern[]).filter((id) =>
    INJECTION_PATTERNS[id].test(normalized),
  );
}
