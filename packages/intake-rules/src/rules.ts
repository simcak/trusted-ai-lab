/**
 * The Intake rule set. Every rule is data: `{ id, stage, when, effect, rationale, reference }`.
 *
 * Stage `pattern` sees only the form (`IntakeFacts`) and decides which architecture patterns
 * are excluded. Stage `outcome` also sees the chosen `pattern` and derives the human in the
 * loop, the AI Act category and the controls. Rationales are Czech because they are shown
 * verbatim to the reader; ids, fields and values stay English.
 *
 * Adding a rule: add it here, then add a case to `RULE_CASES` in `rules.test.ts`
 * (the type system refuses a rule without a test).
 */
import type { AiActCategory, MilestoneId } from './ai-act.ts';
import type { Condition } from './condition.ts';
import type { ControlId } from './controls.ts';
import type { IntakeFacts } from './input.ts';
import { AI_PATTERNS, GENAI_PATTERNS, NON_AI_PATTERNS } from './patterns.ts';
import type { PatternId, TechnicalPattern } from './patterns.ts';
import { aiAct, gdpr, owasp, principle, RULES_OF_ML, type Reference } from './references.ts';

export interface OutcomeFacts extends IntakeFacts {
  pattern: PatternId;
}

export type PatternEffect =
  | { kind: 'exclude'; patterns: readonly TechnicalPattern[] }
  /** Prohibited practice: nothing may be built. */
  | { kind: 'block' }
  /** Meta rule: of the remaining patterns, take the simplest. */
  | { kind: 'prefer-simplest' }
  /** Meta rule: no automated pattern remains. */
  | { kind: 'fallback' };

export type OutcomeEffect =
  | { kind: 'human-in-the-loop' }
  | { kind: 'ai-act'; category: AiActCategory; appliesFrom: MilestoneId }
  | { kind: 'controls'; controls: readonly ControlId[] };

interface RuleBase {
  id: string;
  rationale: string;
  reference: Reference;
}

export interface PatternRule extends RuleBase {
  stage: 'pattern';
  when: Condition<IntakeFacts>;
  effect: PatternEffect;
}

export interface OutcomeRule extends RuleBase {
  stage: 'outcome';
  when: Condition<OutcomeFacts>;
  effect: OutcomeEffect;
}

export type Rule = PatternRule | OutcomeRule;

const USES_AI = { field: 'pattern', in: AI_PATTERNS } as const;
const USES_GENAI = { field: 'pattern', in: GENAI_PATTERNS } as const;
const HIGH_RISK_AREA = {
  field: 'decisionAboutPeople',
  in: ['credit', 'insurance', 'employment'],
} as const;
const PERSONAL_DATA = { field: 'dataSensitivity', in: ['personal', 'special'] } as const;

export const RULES = [
  // ── Stage 1: which pattern ────────────────────────────────────────────────────────────
  {
    id: 'pattern.prohibited-practice',
    stage: 'pattern',
    when: { field: 'practice', in: ['emotion-workplace', 'social-scoring'] },
    effect: { kind: 'block' },
    rationale:
      'Záměr spadá mezi zakázané praktiky AI Act. Tady není co navrhovat: nejde o volbu technologie, ale o účel, který zákon nepřipouští.',
    reference: aiAct('čl. 5 odst. 1', 'article-5'),
  },
  {
    id: 'pattern.exact-solution',
    stage: 'pattern',
    when: { field: 'deterministic', is: true },
    effect: { kind: 'exclude', patterns: ['classic-ml', 'llm', 'rag', 'agent'] },
    rationale:
      'Úloha má přesné řešení (vzorec, tabulka, pevný postup). Běžný kód je levnější, dá se otestovat a vysvětlit. Model by přidal chybovost tam, kde žádná být nemusí.',
    reference: RULES_OF_ML,
  },
  {
    id: 'pattern.needs-system',
    stage: 'pattern',
    when: {
      all: [
        { field: 'deterministic', is: true },
        { field: 'task', in: ['document-qa', 'actions'] },
      ],
    },
    effect: { kind: 'exclude', patterns: ['no-ai'] },
    rationale:
      'Přesné řešení tu není vzorec, ale systém: vyhledávání v dokumentech nebo workflow s pevnými kroky. Stačí klasický software, AI ani agent nejsou potřeba.',
    reference: principle('nejjednodušší řešení, které splní požadavek'),
  },
  {
    id: 'pattern.no-exact-solution',
    stage: 'pattern',
    when: { field: 'deterministic', is: false },
    effect: { kind: 'exclude', patterns: ['no-ai', 'classic-software'] },
    rationale:
      'Úlohu nejde zapsat pevnými pravidly. Bez učení z dat nebo jazykového modelu se neobejde.',
    reference: principle('AI jen tam, kde pravidla nestačí'),
  },
  {
    id: 'pattern.ml-needs-labels',
    stage: 'pattern',
    when: { field: 'labeledData', is: false },
    effect: { kind: 'exclude', patterns: ['classic-ml'] },
    rationale:
      'Klasické strojové učení se učí z označených příkladů (vstup a správná odpověď). Bez nich nemá z čeho.',
    reference: principle('model je jen tak dobrý jako jeho trénovací data'),
  },
  {
    id: 'pattern.ml-cannot-generate',
    stage: 'pattern',
    when: { field: 'task', in: ['document-qa', 'drafting', 'actions'] },
    effect: { kind: 'exclude', patterns: ['classic-ml'] },
    rationale:
      'Klasické ML třídí, předpovídá a hodnotí. Negeneruje text a nejedná v jiných systémech.',
    reference: principle('vzor podle typu úlohy'),
  },
  {
    id: 'pattern.single-call-scope',
    stage: 'pattern',
    when: { field: 'task', in: ['document-qa', 'actions'] },
    effect: { kind: 'exclude', patterns: ['llm'] },
    rationale:
      'Jedno volání modelu nestačí. Odpovědi z vašich dokumentů potřebují vyhledávání (RAG), jinak si je model domýšlí. Akce potřebují nástroje (agent).',
    reference: owasp('LLM07:2026', 'Misinformation'),
  },
  {
    id: 'pattern.rag-only-for-documents',
    stage: 'pattern',
    when: { not: { field: 'task', is: 'document-qa' } },
    effect: { kind: 'exclude', patterns: ['rag'] },
    rationale:
      'Úloha nehledá odpovědi ve znalostní bázi. Vyhledávací vrstva by přidala složitost a další místo, kudy můžou uniknout data.',
    reference: owasp('LLM09:2026', 'Vector and Embedding Weaknesses'),
  },
  {
    id: 'pattern.agent-only-for-actions',
    stage: 'pattern',
    when: { not: { field: 'task', is: 'actions' } },
    effect: { kind: 'exclude', patterns: ['agent'] },
    rationale:
      'Systém nemusí sám jednat v jiných systémech. Agent by zvýšil riziko nadměrné autonomie bez přínosu.',
    reference: owasp('LLM03:2026', 'Excessive Agency'),
  },
  {
    id: 'pattern.explainable-decisions',
    stage: 'pattern',
    when: {
      all: [
        { field: 'explainability', is: 'high' },
        { not: { field: 'decisionAboutPeople', is: 'none' } },
      ],
    },
    effect: { kind: 'exclude', patterns: ['llm', 'rag', 'agent'] },
    rationale:
      'U rozhodnutí o lidech musí jít každý výsledek vysvětlit a zopakovat. Generativní model to spolehlivě neumí, interpretovatelný model nebo pravidla ano.',
    reference: aiAct('čl. 86 odst. 1', 'article-86'),
  },
  {
    id: 'pattern.realtime-latency',
    stage: 'pattern',
    when: { field: 'latency', is: 'realtime' },
    effect: { kind: 'exclude', patterns: ['llm', 'rag', 'agent'] },
    rationale:
      'Odpověď je potřeba okamžitě. Doba odpovědi generativního modelu roste s délkou výstupu a nedá se zaručit.',
    reference: principle('latence jako tvrdý požadavek'),
  },
  {
    id: 'pattern.prefer-simplest',
    stage: 'pattern',
    when: { always: true },
    effect: { kind: 'prefer-simplest' },
    rationale:
      'Z vyhovujících vzorů vybírá ten nejjednodušší. Složitější vzor přidává náklady a riziko a musí si je obhájit.',
    reference: principle('nejjednodušší řešení, které splní požadavek'),
  },
  {
    id: 'pattern.no-candidate',
    stage: 'pattern',
    when: { always: true },
    effect: { kind: 'fallback' },
    rationale:
      'Žádný automatizovaný vzor nesplňuje požadavky. Rozhodnutí nechte na člověku a začněte sbírat označené příklady, třeba to za čas půjde.',
    reference: principle('když nic nesedí, neautomatizovat'),
  },

  // ── Stage 2: human in the loop ────────────────────────────────────────────────────────
  {
    id: 'hitl.high-risk',
    stage: 'outcome',
    when: { all: [HIGH_RISK_AREA, USES_AI] },
    effect: { kind: 'human-in-the-loop' },
    rationale:
      'Vysoce rizikový systém musí umožnit účinný lidský dohled a nasazující ho musí svěřit lidem s potřebnou kompetencí a pravomocí. Model navrhne, člověk rozhodne.',
    reference: aiAct('čl. 14 odst. 1 a čl. 26 odst. 2', 'article-14'),
  },
  {
    id: 'hitl.low-error-tolerance',
    stage: 'outcome',
    when: { all: [{ field: 'errorTolerance', is: 'low' }, USES_GENAI] },
    effect: { kind: 'human-in-the-loop' },
    rationale:
      'Chyba je drahá a jazykový model občas odpoví sebejistě a špatně. Výstup před použitím zkontroluje člověk.',
    reference: owasp('LLM07:2026', 'Misinformation'),
  },
  {
    id: 'hitl.agent-actions',
    stage: 'outcome',
    when: { field: 'pattern', is: 'agent' },
    effect: { kind: 'human-in-the-loop' },
    rationale:
      'Akce s dopadem (odeslání, zápis, platba) schvaluje člověk. Agent jen připraví návrh.',
    reference: owasp('LLM03:2026', 'Excessive Agency'),
  },

  // ── Stage 2: AI Act (indicative) ──────────────────────────────────────────────────────
  {
    id: 'aiact.prohibited-emotion-workplace',
    stage: 'outcome',
    when: { field: 'practice', is: 'emotion-workplace' },
    effect: { kind: 'ai-act', category: 'prohibited', appliesFrom: 'chapters-i-ii' },
    rationale:
      'Odvozování emocí lidí na pracovišti a ve vzdělávání je zakázané. Výjimkou jsou jen zdravotní a bezpečnostní důvody.',
    reference: aiAct('čl. 5 odst. 1 písm. f)', 'article-5'),
  },
  {
    id: 'aiact.prohibited-social-scoring',
    stage: 'outcome',
    when: { field: 'practice', is: 'social-scoring' },
    effect: { kind: 'ai-act', category: 'prohibited', appliesFrom: 'chapters-i-ii' },
    rationale:
      'Hodnocení nebo klasifikace lidí podle jejich sociálního chování či osobních vlastností s nepříznivými důsledky (social scoring) je zakázané.',
    reference: aiAct('čl. 5 odst. 1 písm. c)', 'article-5'),
  },
  {
    id: 'aiact.high-risk-credit',
    stage: 'outcome',
    when: { all: [{ field: 'decisionAboutPeople', is: 'credit' }, USES_AI] },
    effect: { kind: 'ai-act', category: 'high-risk', appliesFrom: 'annex-iii' },
    rationale:
      'Hodnocení úvěruschopnosti fyzických osob a stanovení jejich úvěrového skóre je vysoce rizikové. Výjimkou je odhalování finančních podvodů.',
    reference: aiAct('příloha III bod 5 písm. b)', 'annex-3'),
  },
  {
    id: 'aiact.high-risk-insurance',
    stage: 'outcome',
    when: { all: [{ field: 'decisionAboutPeople', is: 'insurance' }, USES_AI] },
    effect: { kind: 'ai-act', category: 'high-risk', appliesFrom: 'annex-iii' },
    rationale:
      'Posouzení rizika a stanovení ceny pro fyzické osoby u životního a zdravotního pojištění je vysoce rizikové.',
    reference: aiAct('příloha III bod 5 písm. c)', 'annex-3'),
  },
  {
    id: 'aiact.high-risk-employment',
    stage: 'outcome',
    when: { all: [{ field: 'decisionAboutPeople', is: 'employment' }, USES_AI] },
    effect: { kind: 'ai-act', category: 'high-risk', appliesFrom: 'annex-iii' },
    rationale:
      'Nábor, výběr zaměstnanců a rozhodování o pracovních vztazích jsou vysoce rizikové oblasti.',
    reference: aiAct('příloha III bod 4', 'annex-3'),
  },
  {
    id: 'aiact.transparency-interaction',
    stage: 'outcome',
    when: { all: [{ field: 'audience', is: 'clients' }, USES_GENAI] },
    effect: { kind: 'ai-act', category: 'transparency', appliesFrom: 'general' },
    rationale: 'Klient musí vědět, že komunikuje s AI, pokud to není zřejmé z okolností.',
    reference: aiAct('čl. 50 odst. 1', 'article-50'),
  },
  {
    id: 'aiact.minimal',
    stage: 'outcome',
    when: {
      all: [
        USES_AI,
        { not: HIGH_RISK_AREA },
        { not: { all: [{ field: 'audience', is: 'clients' }, USES_GENAI] } },
      ],
    },
    effect: { kind: 'ai-act', category: 'minimal', appliesFrom: 'chapters-i-ii' },
    rationale:
      'Žádná zvláštní povinnost podle AI Act. Platí jen obecná povinnost podporovat AI gramotnost lidí, kteří se systémem pracují.',
    reference: aiAct('čl. 4', 'article-4'),
  },
  {
    id: 'aiact.not-ai-system',
    stage: 'outcome',
    when: {
      all: [
        { field: 'pattern', in: NON_AI_PATTERNS },
        { field: 'practice', is: 'none' },
      ],
    },
    effect: { kind: 'ai-act', category: 'out-of-scope', appliesFrom: 'chapters-i-ii' },
    rationale:
      'Doporučené řešení není AI systém (pravidla definovaná lidmi). AI Act se na něj nevztahuje. Ostatní předpisy (GDPR) ale platí dál.',
    reference: aiAct('čl. 3 bod 1', 'article-3'),
  },

  // ── Stage 2: data and controls ────────────────────────────────────────────────────────
  {
    id: 'data.personal-to-llm',
    stage: 'outcome',
    when: { all: [PERSONAL_DATA, USES_GENAI] },
    effect: { kind: 'controls', controls: ['pseudonymization'] },
    rationale:
      'Do modelu nemají odcházet osobní údaje, které k úloze nepotřebuje. Před voláním je nahraďte zástupnými symboly a odpověď re-identifikujte lokálně.',
    reference: gdpr('čl. 5 odst. 1 písm. c) a čl. 25'),
  },
  {
    id: 'data.special-local',
    stage: 'outcome',
    when: { all: [{ field: 'dataSensitivity', is: 'special' }, USES_AI] },
    effect: { kind: 'controls', controls: ['local-processing'] },
    rationale:
      'Zvláštní kategorie údajů (např. zdravotní) zpracovávejte jen ve vlastním prostředí nebo přímo na zařízení, ne u externího poskytovatele.',
    reference: gdpr('čl. 9'),
  },
  {
    id: 'data.provider-terms',
    stage: 'outcome',
    when: {
      all: [{ field: 'dataSensitivity', in: ['confidential', 'personal', 'special'] }, USES_GENAI],
    },
    effect: { kind: 'controls', controls: ['provider-terms'] },
    rationale:
      'Citlivá data jdou k poskytovateli modelu. Smluvně ošetřete, že se na nich netrénuje, kde se zpracovávají a jak dlouho se uchovávají.',
    reference: owasp('LLM02:2026', 'Sensitive Information Disclosure'),
  },
  {
    id: 'data.permission-aware-retrieval',
    stage: 'outcome',
    when: {
      all: [{ field: 'pattern', is: 'rag' }, { not: { field: 'dataSensitivity', is: 'public' } }],
    },
    effect: { kind: 'controls', controls: ['permission-aware-retrieval'] },
    rationale:
      'Vyhledávání smí vrátit jen dokumenty, ke kterým má tazatel přístup. Jinak RAG obejde přístupová práva.',
    reference: owasp('LLM09:2026', 'Vector and Embedding Weaknesses'),
  },
  {
    id: 'control.prompt-injection',
    stage: 'outcome',
    when: { field: 'pattern', in: ['rag', 'agent'] },
    effect: { kind: 'controls', controls: ['prompt-injection-defense'] },
    rationale:
      'Dokumenty a výstupy nástrojů jsou nedůvěryhodný vstup. Můžou obsahovat skryté pokyny pro model, proto je oddělte a hlídejte.',
    reference: owasp('LLM01:2026', 'Prompt Injection'),
  },
  {
    id: 'control.agent-guardrails',
    stage: 'outcome',
    when: { field: 'pattern', is: 'agent' },
    effect: { kind: 'controls', controls: ['agent-guardrails', 'action-approval'] },
    rationale:
      'Agent dostane jen nástroje, které jeho role potřebuje, má rozpočet kroků a každé jeho rozhodnutí se zapisuje. Akce s dopadem čekají na schválení.',
    reference: owasp('LLM03:2026', 'Excessive Agency'),
  },
  {
    id: 'control.automated-decision',
    stage: 'outcome',
    when: {
      all: [
        { not: { field: 'decisionAboutPeople', is: 'none' } },
        { field: 'automation', is: 'automatic' },
        { field: 'practice', is: 'none' },
      ],
    },
    effect: { kind: 'controls', controls: ['human-intervention', 'dpia'] },
    rationale:
      'Automatizované rozhodnutí o člověku s právním nebo podobně významným dopadem: dotčený má právo na lidský zásah a napadení rozhodnutí. Před spuštěním je potřeba posouzení vlivu (DPIA). Platí i bez AI.',
    reference: gdpr('čl. 22 a čl. 35'),
  },
  {
    id: 'control.high-risk-obligations',
    stage: 'outcome',
    when: { all: [HIGH_RISK_AREA, USES_AI] },
    effect: { kind: 'controls', controls: ['human-oversight', 'logging'] },
    rationale:
      'Vysoce rizikový systém musí automaticky zaznamenávat události (logy) a mít navržený lidský dohled.',
    reference: aiAct('čl. 12 odst. 1 a čl. 14', 'article-12'),
  },
  {
    id: 'control.fria',
    stage: 'outcome',
    when: {
      all: [{ field: 'decisionAboutPeople', in: ['credit', 'insurance'] }, USES_AI],
    },
    effect: { kind: 'controls', controls: ['fria'] },
    rationale:
      'Kdo nasazuje systém pro úvěrové hodnocení nebo životní a zdravotní pojištění, musí před nasazením posoudit dopad na základní práva (FRIA).',
    reference: aiAct('čl. 27 odst. 1', 'article-27'),
  },
  {
    id: 'control.evals',
    stage: 'outcome',
    when: USES_GENAI,
    effect: { kind: 'controls', controls: ['evals'] },
    rationale:
      'Kvalitu odpovědí měřte na pevné sadě příkladů a pouštějte ji při každé změně promptu nebo modelu.',
    reference: owasp('LLM07:2026', 'Misinformation'),
  },
] as const satisfies readonly Rule[];

export type RuleId = (typeof RULES)[number]['id'];

const BY_ID = new Map<string, Rule>(RULES.map((r) => [r.id, r]));

export function getRule(id: RuleId): Rule {
  const rule = BY_ID.get(id);
  if (!rule) throw new Error(`Unknown rule: ${id}`);
  return rule;
}
