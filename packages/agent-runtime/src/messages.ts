import type { Persona } from './config.ts';
import type { InjectionPattern } from './policy/injection.ts';

/**
 * Texts the runtime itself produces: answers when the policy ends a run and the reasons of policy
 * decisions in the trace. Czech, like the rationale texts in intake-rules — they are data the
 * runtime emits, not UI labels. Changing them changes recorded runs (re-record).
 */
export const ANSWERS = {
  adviceRefused:
    'Investiční doporučení vám dát nemohu: nevím nic o vašich cílech, zkušenostech ani o tom, jaké riziko unesete, a tohle demo navíc pracuje jen s fiktivními fondy. Mohu ale fondy věcně porovnat, třeba podle poplatků nebo rizika, a spočítat, kolik byste na poplatcích zaplatili.',
  adviceRemoved:
    'Odpověď modelu obsahovala investiční doporučení, a proto ji pravidla nezobrazí. Mohu fondy věcně porovnat podle poplatků nebo rizika.',
  loopStopped:
    'Požadavek se nepodařilo dokončit: nástroj opakovaně selhal, a tak jsem další pokusy zastavil. Zkuste to prosím později.',
  budgetStopped:
    'Požadavek se nevešel do nastaveného rozpočtu kroků nebo tokenů, a tak jsem běh bezpečně ukončil. Zkuste dotaz zúžit.',
  stepLimit: 'Běh dosáhl tvrdého limitu volání modelu a runtime ho ukončil.',
  modelRefusal: 'Model odmítl odpovědět.',
  maxTokens: 'Odpověď modelu byla useknuta limitem tokenů.',
} as const;

const list = (items: readonly string[]) => items.join(', ');

export const REASONS = {
  toolsOffered: (persona: Persona, offered: readonly string[]) =>
    `Persona ${persona} smí použít: ${list(offered)}.`,
  toolsHidden: (persona: Persona, offered: readonly string[], hidden: readonly string[]) =>
    `Persona ${persona} smí použít jen ${list(offered)}. Skryto: ${list(hidden)}.`,
  toolNotAllowed: (persona: Persona, tool: string) =>
    `Nástroj ${tool} není pro personu ${persona} povolený.`,
  invalidArgs: (tool: string, detail: string) => `Neplatné argumenty nástroje ${tool}: ${detail}`,
  toolAllowed: (tool: string) =>
    `Nástroj ${tool} je pro personu povolený, argumenty jsou platné, volání se neopakuje.`,
  repeatedCall: (tool: string, times: number) =>
    `Stejné volání ${tool} se stejnými argumenty už proběhlo ${times}×. Běh se ukončuje.`,
  repeatedErrors: (tool: string, times: number) =>
    `Nástroj ${tool} selhal ${times}× po sobě. Běh se ukončuje.`,
  stepBudget: (max: number) => `Vyčerpán rozpočet ${max} volání modelu.`,
  tokenBudget: (used: number, max: number) =>
    `Spotřebováno ${used} tokenů z rozpočtu ${max}. Další volání modelu se nepovoluje.`,
  adviceRequest: 'Dotaz žádá investiční doporučení. Odpoví pravidla, model se nevolá.',
  adviceAnswer: 'Odpověď modelu obsahuje investiční doporučení. Nahrazena zdvořilým odmítnutím.',
  injection: (tool: string, path: string, patterns: readonly InjectionPattern[]) =>
    `Pole ${path} ve výstupu ${tool} vypadá jako prompt injection (${list(patterns)}). Obsah se modelu nepředá.`,
  approvalRequired: (tool: string) =>
    `Akce ${tool} má dopad mimo konverzaci a vyžaduje schválení člověkem.`,
  approved: (by: string) => `Schváleno člověkem (${by}).`,
  rejected: (by: string) => `Zamítnuto člověkem (${by}).`,
  rejectedForModel: 'Člověk koncept zamítl. Nic nebylo vytvořeno ani odesláno.',
  deniedForModel: (reason: string) => `Volání zamítla pravidla: ${reason}`,
} as const;

/** Replaces a quarantined field in a tool result. */
export const QUARANTINED = '[ODSTRANĚNO PRAVIDLY: možná prompt injection]';
