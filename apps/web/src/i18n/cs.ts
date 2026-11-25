import type {
  AiActCategory,
  ControlId,
  DataSensitivity,
  FactField,
  IntakeFacts,
  ModelTier,
  PatternId,
  PresetId,
} from '@trusted-ai-lab/intake-rules';
import type { RuleId, RunStatus, ScenarioId } from '@trusted-ai-lab/agent-runtime';
import type { LlmErrorCode, ProviderId } from '@trusted-ai-lab/llm-core';
import type { PiiType, ReasonCode } from '@trusted-ai-lab/pii-cz';
import type { TrimpCoefficient } from '../modules/local/activity/heart-rate.ts';
import type { MetadataKind, ParseErrorCode, Sport } from '../modules/local/activity/types.ts';
import type { LoadErrorKind } from '../modules/local/coach/engine.ts';
import type { CoachModelKey } from '../modules/local/coach/model.ts';
import type { ModuleId } from '../modules/registry.ts';
import type { NetworkPhase } from '../modules/local/network/network-monitor.ts';

/**
 * All user-facing Czech texts. Components must not hard-code UI strings.
 * Keep claims honest (CLAUDE.md rule 8): placeholders describe what a module *will* do.
 */

const piiTypes: Record<PiiType, string> = {
  PERSON: 'Jméno osoby',
  RODNE_CISLO: 'Rodné číslo',
  ADDRESS: 'Adresa',
  PHONE: 'Telefon',
  EMAIL: 'E-mail',
  BANK_ACCOUNT: 'Číslo účtu',
  IBAN: 'IBAN',
  ICO: 'IČO',
  DIC: 'DIČ',
  ID_CARD: 'Číslo OP',
  PASSPORT: 'Číslo pasu',
  PSC: 'PSČ',
};

const piiReasons: Record<ReasonCode, string> = {
  format: 'odpovídá formátu',
  checksum_mod11: 'sedí kontrolní součet (mod 11)',
  checksum_mod97: 'sedí kontrolní součet IBAN (mod 97)',
  valid_birth_date: 'obsahuje platné datum narození',
  nine_digit_pre_1954: 'devítimístné RČ (narození před rokem 1954), bez kontrolního součtu',
  remainder_10_exception: 'historická výjimka: zbytek 10 → kontrolní číslice 0',
  supplementary_series: 'doplňková řada (měsíc +20 / +70)',
  slash_separator: 'zapsáno s lomítkem',
  known_bank_code: 'kód banky je v číselníku ČNB',
  unknown_bank_code: 'kód banky není v číselníku ČNB',
  account_prefix: 's předčíslím',
  cz_account_inside_iban: 'uvnitř je platné české číslo účtu',
  dic_from_ico: 'DIČ odvozené z IČO',
  dic_from_rodne_cislo: 'DIČ odvozené z rodného čísla',
  dic_special_699: 'DIČ řady 699 (osoba bez rodného čísla)',
  country_code: 'předvolba +420',
  grouped_digits: 'číslice ve skupinách',
  context_keyword: 'poblíž je kontextové slovo („r.č.“, „tel.“, „IČO“…)',
  negative_context: 'vypadá jako částka, skóre sníženo',
  obfuscated_email: 'zamaskovaný zápis „(at)“',
  first_name_dictionary: 'křestní jméno ze seznamu MV ČR',
  inflected_form: 've skloňovaném tvaru',
  followed_by_surname: 'jméno a příjmení vedle sebe',
  honorific_or_title: 'po oslovení, roli nebo titulu',
  surname_suffix: 'typická koncovka příjmení',
  street_and_number: 'ulice a číslo domu',
  postal_code_and_city: 'PSČ a obec',
  ner_model: 'rozpoznal NER model',
};

const intakePresets: Record<PresetId, { label: string; description: string }> = {
  'fee-calculation': {
    label: 'Výpočet poplatků',
    description:
      'Klient na webu zadá částku a dobu investice a uvidí, kolik zaplatí na poplatcích podle sazebníku.',
  },
  'policy-summary': {
    label: 'Shrnutí interních směrnic',
    description:
      'Zaměstnanci se ptají na interní směrnice a dostanou odpověď s odkazem na konkrétní pasáž.',
  },
  'credit-decision': {
    label: 'Automatické rozhodnutí o úvěru',
    description:
      'Systém z údajů žadatele spočítá skóre a sám schválí nebo zamítne spotřebitelský úvěr.',
  },
  'client-chatbot': {
    label: 'Klientský chatbot',
    description: 'Chatbot na webu odpovídá klientům na otázky k produktům a k jejich smlouvám.',
  },
  'mail-triage': {
    label: 'Třídění příchozí pošty',
    description:
      'Příchozí e-maily se automaticky přiřadí správnému oddělení. Můžou obsahovat i zdravotní údaje z pojistných událostí.',
  },
  'contract-extraction': {
    label: 'Extrakce dat ze smluv',
    description:
      'Ze smluv v PDF se vytáhnou smluvní strany, částky a termíny do strukturované podoby pro další systém.',
  },
  'emotion-analysis': {
    label: 'Emoce operátorů call centra',
    description:
      'Z hlasu operátorů se během hovorů vyhodnocuje jejich emoční stav jako podklad pro jejich hodnocení.',
  },
  'advisor-assistant': {
    label: 'Asistent poradce',
    description:
      'Poradce zadá požadavek klienta. Asistent vyhledá vhodné fondy, spočítá poplatky a připraví koncept e-mailu.',
  },
};

type FieldTexts<K extends FactField> = {
  legend: string;
  /** Short name used when a rule condition is shown as text. */
  short: string;
  options: Record<`${IntakeFacts[K]}`, string>;
};

const intakeFields: { [K in FactField]: FieldTexts<K> } = {
  task: {
    legend: 'Co má systém dělat',
    short: 'Úloha',
    options: {
      calculation: 'Spočítat výsledek',
      'document-qa': 'Odpovídat z dokumentů',
      classification: 'Třídit',
      extraction: 'Vytěžit údaje z dokumentů',
      drafting: 'Psát texty',
      actions: 'Provádět kroky v systémech',
      scoring: 'Hodnotit nebo předpovídat',
    },
  },
  deterministic: {
    legend: 'Dá se úloha zapsat přesnými pravidly nebo vzorcem?',
    short: 'Přesné řešení',
    options: { true: 'Ano', false: 'Ne' },
  },
  labeledData: {
    legend: 'Máte historické příklady se správnou odpovědí?',
    short: 'Označená data',
    options: { true: 'Ano', false: 'Ne' },
  },
  dataSensitivity: {
    legend: 'Nejcitlivější data v systému',
    short: 'Data',
    options: {
      public: 'Veřejná',
      internal: 'Interní',
      confidential: 'Důvěrná',
      personal: 'Osobní údaje',
      special: 'Zvláštní kategorie (např. zdraví)',
    },
  },
  audience: {
    legend: 'Kdo se systémem pracuje',
    short: 'Uživatelé',
    options: { internal: 'Zaměstnanci', clients: 'Klienti' },
  },
  decisionAboutPeople: {
    legend: 'Rozhoduje výstup o lidech?',
    short: 'Rozhodnutí o lidech',
    options: {
      none: 'Ne',
      credit: 'Úvěr',
      insurance: 'Životní / zdravotní pojištění',
      employment: 'Zaměstnání (HR)',
      other: 'Jiné rozhodnutí o lidech',
    },
  },
  automation: {
    legend: 'Kdo má poslední slovo',
    short: 'Automatizace',
    options: { assist: 'Člověk (systém radí)', automatic: 'Systém (rozhodne nebo jedná sám)' },
  },
  explainability: {
    legend: 'Musí jít každý výsledek přesně vysvětlit?',
    short: 'Vysvětlitelnost',
    options: { standard: 'Stačí obecně', high: 'Ano, každý' },
  },
  errorTolerance: {
    legend: 'Kolik chyb snesete',
    short: 'Tolerance chyb',
    options: { low: 'Nízká (chyba je drahá)', medium: 'Střední', high: 'Vysoká' },
  },
  practice: {
    legend: 'Zvláštní účel',
    short: 'Účel',
    options: {
      none: 'Žádný z níže uvedených',
      'emotion-workplace': 'Rozpoznávání emocí zaměstnanců',
      'social-scoring': 'Hodnocení lidí podle chování (social scoring)',
    },
  },
  volume: {
    legend: 'Dotazů měsíčně',
    short: 'Objem',
    options: {
      hundreds: '100–1 000',
      thousands: '1 000–10 000',
      'tens-of-thousands': '10 000–100 000',
      'hundreds-of-thousands': '100 000–1 000 000',
    },
  },
  latency: {
    legend: 'Jak rychle je potřeba odpověď',
    short: 'Latence',
    options: {
      realtime: 'Okamžitě (pod 1 s)',
      interactive: 'Během pár sekund',
      batch: 'Stačí dávkově',
    },
  },
};

const intakePatterns: Record<PatternId, { label: string; summary: string }> = {
  'no-ai': {
    label: 'AI nepotřebujete',
    summary:
      'Úloha má přesné řešení. Stačí výpočet nebo pravidla v běžném kódu, který jde otestovat a vysvětlit.',
  },
  'classic-software': {
    label: 'Klasický software',
    summary: 'Pevný postup nebo vyhledávání bez AI: workflow, fulltextové hledání, formulář.',
  },
  'classic-ml': {
    label: 'Klasické strojové učení',
    summary:
      'Model natrénovaný na vašich historických příkladech. Je levný, rychlý a jeho přesnost jde změřit.',
  },
  llm: {
    label: 'Jazykový model (jedno volání)',
    summary:
      'Jedno zavolání jazykového modelu s pevně daným tvarem odpovědi, bez vyhledávání a bez nástrojů.',
  },
  rag: {
    label: 'RAG (vyhledávání + jazykový model)',
    summary:
      'Model odpovídá jen z dokumentů, které k dotazu najde vyhledávání, a odkazuje na zdroj.',
  },
  agent: {
    label: 'Agent',
    summary: 'Model sám volá nástroje v několika krocích. Každý krok hlídají pravidla v kódu.',
  },
  'human-in-the-loop': {
    label: 'Člověk ve smyčce',
    summary:
      'Žádný automatizovaný vzor nesplňuje požadavky. Rozhoduje člověk, systém mu nanejvýš připraví podklady.',
  },
};

const aiActCategories: Record<AiActCategory, string> = {
  prohibited: 'Zakázaná praktika',
  'high-risk': 'Vysoce riziková',
  transparency: 'Povinnosti transparentnosti',
  minimal: 'Minimální riziko',
  'out-of-scope': 'Mimo AI Act (nejde o AI systém)',
};

const intakeDataClasses: Record<DataSensitivity, string> = {
  public: 'Veřejná data',
  internal: 'Interní data',
  confidential: 'Důvěrná data (obchodní tajemství)',
  personal: 'Osobní údaje (GDPR)',
  special: 'Zvláštní kategorie osobních údajů (GDPR)',
};

const intakeControls: Record<ControlId, string> = {
  pseudonymization: 'Pseudonymizace před voláním modelu',
  'local-processing': 'Zpracování jen ve vlastním prostředí nebo na zařízení',
  'provider-terms':
    'Smlouva s poskytovatelem modelu: data se nepoužijí k tréninku a je jasné, kde se zpracují a jak dlouho se uchovají',
  'permission-aware-retrieval': 'Vyhledávání respektuje přístupová práva',
  'prompt-injection-defense': 'Ochrana proti prompt injection',
  'agent-guardrails': 'Pojistky agenta: povolené nástroje, limity, záznam kroků',
  'action-approval': 'Schválení akcí člověkem',
  'human-intervention': 'Právo na lidský zásah a napadení rozhodnutí',
  dpia: 'Posouzení vlivu na ochranu osobních údajů (DPIA)',
  'human-oversight': 'Navržený lidský dohled',
  logging: 'Automatický záznam událostí (logy)',
  fria: 'Posouzení dopadu na základní práva (FRIA)',
  evals: 'Měření kvality na pevné sadě příkladů (evaly)',
};

const agentScenarios: Record<ScenarioId, { title: string; watch: string }> = {
  's1-bezny-dotaz': {
    title: 'Běžný dotaz',
    watch: 'Agent najde fondy a poplatky spočítá nástrojem, ne z hlavy.',
  },
  's2-injekce': {
    title: 'Prompt injection v datech',
    watch:
      'Popis jednoho fondu obsahuje skrytý pokyn napsat e-mail všem klientům. Sledujte, co se s ním stane a kdo schvaluje koncept.',
  },
  's3-email-klient': {
    title: 'Klient chce poslat e-mail',
    watch: 'Klient nástroj pro e-maily nemá. Se zapnutými pravidly ho model vůbec nedostane.',
  },
  's4-rodne-cislo': {
    title: 'Rodné číslo v dotazu',
    watch: 'Porovnejte, co odchází do modelu. S pravidly jen zástupné symboly.',
  },
  's5-smycka': {
    title: 'Nedostupná služba',
    watch: 'Vyhledávání vrací chybu 503 a model to zkouší znovu. Sledujte, kdy a čím běh skončí.',
  },
  's6-doporuceni': {
    title: 'Žádost o investiční doporučení',
    watch: 'S pravidly odpoví pravidla obsahu a model se nevolá. Bez nich rozhoduje jen prompt.',
  },
};

const agentRules: Record<RuleId, string> = {
  'tool-allowlist':
    'Klient smí hledat a počítat, poradce navíc připravit e-mail. Nepovolený nástroj model nedostane a brána ho zablokuje.',
  'tool-args': 'Argumenty z modelu jsou nedůvěryhodné. Ověří je schéma nástroje.',
  'step-budget': 'Nejvýš 5 volání modelu na běh.',
  'token-budget': 'Nejvýš 80 000 tokenů na běh.',
  'loop-detection': 'Třetí stejné volání nebo tři chyby téhož nástroje po sobě běh ukončí.',
  'pii-pseudonymize':
    'Vše, co jde do modelu, projde knihovnou pii-cz. Skutečné hodnoty se vrací jen lokálně.',
  'untrusted-output': 'Výstup nástroje je ohraničený a označený jako nedůvěryhodná data.',
  'prompt-injection': 'Pole, které vypadá jako pokyn pro model, se modelu nepředá.',
  'content-advice': 'Žádné investiční doporučení: dotaz odmítne a doporučení v odpovědi nahradí.',
  'human-approval': 'Koncept e-mailu čeká na rozhodnutí člověka. Nic se neodesílá.',
};

const agentProviders: Record<ProviderId, string> = {
  replay: 'Přehrání nahrávky',
  'byok-anthropic': 'Claude API',
  'byok-openai': 'OpenAI API',
  webllm: 'Lokální model (WebLLM)',
  'claude-code': 'Claude Code CLI',
};

const agentStatus: Record<RunStatus, string> = {
  completed: 'Model odpověděl',
  refused_by_policy: 'Odpověděla pravidla, model se nevolal',
  stopped_by_policy: 'Běh bezpečně ukončila pravidla',
  step_limit: 'Běh ukončil tvrdý limit runtime',
  model_refusal: 'Model odmítl odpovědět',
  max_tokens: 'Odpověď useknul limit tokenů',
};

const agentErrors: Record<LlmErrorCode | 'drift' | 'aborted', string> = {
  auth: 'Klíč nebyl přijat. Zkontrolujte ho, případně jeho platnost.',
  cors_forbidden:
    'Vaše organizace nepovoluje volání API přímo z prohlížeče (např. kvůli zero data retention nebo Compliance API). S tímto klíčem BYOK fungovat nebude.',
  permission: 'Klíč nemá oprávnění k tomuto modelu nebo workspace.',
  rate_limit: 'API hlásí překročený limit požadavků. Zkuste to za chvíli.',
  bad_request: 'API požadavek odmítlo.',
  server: 'API je dočasně nedostupné. Zkuste to za chvíli.',
  network: 'Spojení s API se nepodařilo navázat.',
  timeout: 'API neodpovědělo včas.',
  unknown: 'Běh se nepodařilo dokončit.',
  drift: 'Nahrávka neodpovídá aktuálnímu kódu a je potřeba ji nahrát znovu.',
  aborted: 'Běh byl přerušen.',
};

/** Terms explained on module pages (chips under the header). Plain language, two sentences. */
const glossaryTerms = {
  llm: {
    term: 'Jazykový model (LLM)',
    text: 'Program natrénovaný na obrovském množství textu, který odhaduje, jaké slovo má následovat. Díky tomu umí psát, shrnovat a odpovídat, ale umí se i plést.',
  },
  slm: {
    term: 'Malý jazykový model',
    text: 'Jazykový model s jednotkami miliard parametrů místo stovek. Vejde se do běžného počítače, je rychlejší a nic nestojí, ale je méně chytrý.',
  },
  token: {
    term: 'Token',
    text: 'Kousek textu, se kterým model pracuje, zhruba část slova. U modelů v cloudu se platí podle počtu tokenů.',
  },
  rag: {
    term: 'RAG',
    text: 'Vyhledávání + jazykový model. Systém nejdřív najde v dokumentech pasáže k dotazu a model odpovídá jen z nich, s odkazem na zdroj.',
  },
  agent: {
    term: 'Agent',
    text: 'AI, která neodpovídá jen textem, ale sama volá nástroje (vyhledávání, výpočet, e-mail) v několika krocích po sobě.',
  },
  guardrails: {
    term: 'Guardrails (pojistky)',
    text: 'Pravidla v kódu kolem AI, která hlídají, co model smí udělat. Nejsou v promptu, takže je model nemůže přemluvit ani obejít.',
  },
  promptInjection: {
    term: 'Prompt injection',
    text: 'Skrytý pokyn v datech, třeba v dokumentu nebo na webu, kterým se útočník snaží AI přimět udělat něco, co nemá.',
  },
  hitl: {
    term: 'Člověk ve smyčce',
    text: 'Důležité rozhodnutí nebo akci potvrzuje člověk. AI jen připraví návrh nebo podklady.',
  },
  aiAct: {
    term: 'AI Act',
    text: 'Nařízení EU o umělé inteligenci. Dělí AI systémy podle rizika a podle toho jim ukládá povinnosti, některé praktiky úplně zakazuje.',
  },
  adr: {
    term: 'ADR',
    text: 'Architecture Decision Record: krátký dokument, který zapisuje, co se rozhodlo, proč a které možnosti se zamítly.',
  },
  personalData: {
    term: 'Osobní údaje',
    text: 'Cokoli, podle čeho jde poznat konkrétního člověka: jméno, rodné číslo, telefon, adresa, ale i poloha. Chrání je GDPR.',
  },
  pseudonymization: {
    term: 'Pseudonymizace',
    text: 'Nahrazení osobních údajů zástupnými symboly, třeba <OSOBA_1>. Kdo nemá mapu symbolů, nepozná, o koho jde.',
  },
  ner: {
    term: 'NER',
    text: 'Rozpoznávání pojmenovaných entit: malý model, který v textu hledá jména osob, míst a firem.',
  },
  eval: {
    term: 'Eval',
    text: 'Měření kvality na pevné sadě příkladů se známou správnou odpovědí. Ukáže, jak často systém trefí a jestli se změnou nezhoršil.',
  },
  trace: {
    term: 'Trace',
    text: 'Záznam všech kroků jednoho běhu: co šlo do modelu, co vrátil a co rozhodla pravidla. Slouží ke kontrole a hledání chyb.',
  },
  replay: {
    term: 'Přehrání nahrávky',
    text: 'Odpovědi modelu se nahrály dopředu a stránka je přehrává. Proto funguje bez klíče, zdarma a pokaždé stejně.',
  },
  byok: {
    term: 'Vlastní klíč (BYOK)',
    text: 'Bring Your Own Key: zadáte vlastní API klíč a stránka volá skutečný model. Platíte vy a klíč zůstává jen v paměti stránky.',
  },
  webgpu: {
    term: 'WebGPU',
    text: 'Rozhraní, přes které smí webová stránka počítat na grafické kartě. Díky němu běží jazykový model přímo v prohlížeči.',
  },
  privacyZone: {
    term: 'Privacy zone',
    text: 'Okruh kolem začátku a konce trasy, který se skryje, aby z nahrané aktivity nešlo poznat, kde bydlíte.',
  },
  trimp: {
    term: 'TRIMP',
    text: 'Training impulse: jedno číslo pro zátěž tréninku. Násobí délku tréninku jeho intenzitou podle tepu.',
  },
} as const satisfies Record<string, { term: string; text: string }>;

export type TermId = keyof typeof glossaryTerms;

export const cs = {
  app: {
    name: 'Bezpečná AI v praxi',
    tagline: 'Od nápadu k bezpečnému nasazení',
    skipToContent: 'Přeskočit na obsah',
    mainNav: 'Moduly',
    loading: 'Načítám…',
  },

  landing: {
    lead: 'Čtyři interaktivní ukázky, jak AI používat chytře a bezpečně, i tam, kde jde o osobní údaje.',
    sublead:
      'Všechno běží přímo v prohlížeči: bez instalace, bez účtu a zdarma. Odpovědi velkých modelů v cloudu jsou předem nahrané, takže stránka funguje pokaždé stejně.',
    storyHeading: 'Čtyři otázky, které si položit, než AI nasadíte',
    proofLabel: 'Co tím dokazuji',
    openModule: (title: string) => `Otevřít modul ${title}`,
    moreHeading: 'Jak je to postavené',
    docsLink: 'Technická rozhodnutí a dokumentace',
    githubLink: 'Zdrojový kód na GitHubu',
  },

  status: {
    planned: (phase: number) => `Připravuje se – fáze ${phase}`,
    ready: 'Hotovo',
  },

  modules: {
    intake: {
      title: 'Intake',
      question: 'Má to vůbec být AI?',
      summary:
        'Popíšete nápad a pravidla navrhnou, jak ho postavit: jestli vůbec s AI, jak je to riskantní a kolik to bude stát.',
      proof:
        'Umím říct „tady AI nepotřebujete“ a každé doporučení zdůvodnit pravidlem, které jde otestovat.',
      willDo: [
        'Formulář pro popis záměru: typ dat, uživatelé, dopad na lidi, nároky na vysvětlitelnost, objem a latence.',
        'Doporučený vzor (bez AI, klasický software, strojové učení, RAG, agent, člověk ve smyčce) včetně zamítnutých alternativ a důvodů.',
        'Klasifikace dat a požadované kontroly s odkazy na další moduly.',
        'Orientační kategorie podle AI Act s odkazem na konkrétní články.',
        'Odhad nákladů jako rozsah a export rozhodnutí (ADR) v Markdownu.',
        'Bez jazykového modelu: pravidla jsou deterministická, vysvětlitelná a pokrytá testy.',
      ],
    },
    pii: {
      title: 'Ochrana dat',
      question: 'Co nesmí odejít do modelu?',
      summary:
        'Kód najde v textu české osobní údaje, třeba rodné číslo nebo číslo účtu, a schová je dřív, než text odejde do jazykového modelu.',
      proof:
        'Rozumím ochraně osobních údajů až na úroveň kódu: kontroluji i kontrolní součty, ne jen tvar čísla, a přesnost měřím.',
      willDo: [
        'Detekce rodného čísla, IČO, DIČ, čísla účtu, IBAN, telefonu, e-mailu, adresy a jmen, vždy s validací, ne jen podle tvaru.',
        'Tři režimy: začernění, konzistentní pseudonymizace a vratná pseudonymizace (mapa zůstává jen v paměti prohlížeče).',
        'Zvýraznění nálezů v textu s typem a důvodem detekce.',
        'Vyhodnocení na syntetickém korpusu: precision, recall a F1 po typech a ukázky chyb.',
        'Poctivé srovnání, kdy stačí vlastní knihovna a kdy je lepší spravovaná služba.',
      ],
    },
    agent: {
      title: 'Agent pod kontrolou',
      question: 'Jak AI bezpečně jedná?',
      summary:
        'AI asistent sám hledá ve fiktivních fondech a počítá poplatky. Každý jeho krok ale hlídají pravidla v kódu, která model nemůže obejít.',
      proof:
        'Umím navrhnout pojistky (guardrails) jako samostatnou, testovatelnou vrstvu: povolené nástroje, limity, schválení člověkem a záznam všech kroků.',
      willDo: [
        'Vlastní agent loop bez frameworku, nejvýš 6 kroků, nad 8 fiktivními fondy.',
        'Policy engine: povolené nástroje podle role, validace argumentů, rozpočet kroků a tokenů, detekce smyček.',
        'Vše, co jde do modelu, projde pseudonymizací z modulu Ochrana dat.',
        'Akce s dopadem (koncept e-mailu) vyžaduje schválení člověkem. Nic se neodesílá.',
        'Šest nahraných scénářů včetně prompt injection, každý se zapnutými i vypnutými guardrails.',
        'Časová osa trace: každé volání modelu a nástroje i každé rozhodnutí pravidel s důvodem.',
      ],
    },
    local: {
      title: 'Lokálně',
      question: 'Co když data nesmí opustit zařízení?',
      summary:
        'Rozbor tréninku z hodinek a malý jazykový model, který ho vysvětlí. Všechno běží ve vašem počítači, data nikam neodcházejí.',
      proof:
        'Umím navrhnout řešení, kde citlivá data zařízení vůbec neopustí, a umím to i doložit.',
      willDo: [
        'Nahrání souboru GPX, TCX nebo FIT a zpracování výhradně v prohlížeči.',
        'Privacy zone: oříznutí začátku a konce trasy, kde bývá adresa bydliště, a odstranění metadat zařízení.',
        'Metriky: vzdálenost, tempo, převýšení, tepové zóny, TRIMP a týdenní zátěž.',
        'Malý lokální model (WebLLM) dostane jen agregované metriky, nikdy surové GPS body.',
        'Panel síťové aktivity, který ukáže, že po nahrání souboru neodešel žádný požadavek.',
      ],
    },
  },

  intake: {
    notice:
      'Tady žádná AI není: doporučení skládají pravidla, každé s důvodem a odkazem na zdroj. Nic se nikam neodesílá.',
    presetsLabel: 'Ukázkové záměry',
    presets: intakePresets,
    formHeading: 'Popište záměr',
    descriptionLabel: 'Popis záměru',
    descriptionHint: 'Pravidla text nečtou, jen ho vloží do staženého dokumentu (ADR).',
    fields: intakeFields,
    groups: { work: 'Úloha a data', impact: 'Dopad a provoz' },

    resultLabel: 'Doporučení',
    patterns: intakePatterns,
    blocked: {
      label: 'Nenasazovat',
      summary: 'Účel je podle AI Act zakázaný. Na volbě technologie tu nezáleží.',
    },
    withHuman: '+ člověk ve smyčce',
    humanWhy: 'Proč člověk ve smyčce',

    aiAct: {
      heading: 'AI Act (orientačně)',
      categories: aiActCategories,
      appliesFrom: (date: string, inForce: boolean) =>
        inForce ? `Platí od ${date}` : `Bude platit od ${date}`,
      asOf: (date: string) => `Stav k ${date} · zdroje`,
      amendedBy: 'Ve znění nařízení (EU) 2026/1744 (Digital Omnibus on AI).',
    },

    data: {
      heading: 'Data a kontroly',
      classes: intakeDataClasses,
      controls: intakeControls,
      none: 'Žádné zvláštní kontroly.',
      moduleLink: (number: number, title: string) => `Modul ${number}: ${title}`,
    },

    cost: {
      heading: 'Odhad nákladů na tokeny',
      tiers: {
        small: 'Malý model',
        medium: 'Střední model',
        large: 'Velký model',
      } satisfies Record<ModelTier, string>,
      perMonth: 'USD / měsíc',
      range: (min: string, max: string) => `${min}–${max}`,
      unverified: 'cena neověřena',
      noTokens: 'Bez nákladů na tokeny: řešení nevolá jazykový model.',
      notTokenBased:
        'Klasické ML se platí provozem a trénováním modelu, ne tokeny. Z ceníku tokenů se neodhaduje.',
      assumption: (input: string, output: string) =>
        `Předpoklad dema, ne měření: ${input} vstupních a ${output} výstupních tokenů na dotaz.`,
      batch: 'Dávkově: počítáno s cenami Batch API (poloviční).',
      sources: 'Ceníky',
      retrievedAt: (date: string) => `k ${date}`,
    },

    rejected: {
      heading: 'Zamítnuté alternativy',
      allBlocked: 'Žádná: účel je zakázaný.',
    },

    rules: {
      summary: (n: number) => `Proč to systém doporučil: použitá pravidla (${n})`,
      condition: 'Kdy',
      always: 'vždy (vyhodnocuje engine)',
      and: ' a zároveň ',
      or: ' nebo ',
      not: (inner: string) => `neplatí (${inner})`,
      isNot: (field: string, value: string) => `${field}: není ${value}`,
      is: (field: string, value: string) => `${field}: ${value}`,
      oneOf: ' / ',
      patternField: 'Zvolený vzor',
    },

    adr: {
      button: 'Stáhnout ADR (.md)',
      hint: 'Rozhodnutí ve formátu MADR, připravené k uložení do repozitáře.',
      untitled: 'Nový záměr',
      title: (name: string) => `ADR: ${name}`,
      status: 'Stav',
      statusValue: 'navrženo (vygenerováno modulem Intake)',
      date: 'Datum',
      decision: 'Rozhodnutí',
      context: 'Kontext a problém',
      noDescription: '(bez popisu)',
      parameter: 'Parametr',
      value: 'Hodnota',
      chosen: 'Zvolený vzor',
      alternatives: 'Zvažované alternativy',
      rejectedBecause: 'zamítnuto',
      consequences: 'Důsledky',
      controls: 'Požadované kontroly',
      aiAct: (date: string) => `AI Act (orientačně, stav k ${date})`,
      category: 'Kategorie',
      sources: 'Zdroje',
      cost: 'Odhad nákladů na tokeny',
      tier: 'Velikost modelu',
      models: 'Modely',
      rules: 'Použitá pravidla',
      rule: 'Pravidlo',
      rationale: 'Zdůvodnění',
      reference: 'Zdroj',
      disclaimer:
        'Vygenerováno technickým demem „Bezpečná AI v praxi“ (modul Intake). Klasifikace podle AI Act je orientační a nejde o právní posouzení.',
    },
  },

  pii: {
    types: piiTypes,
    reasons: piiReasons,
    privacyNote:
      'Vše na této stránce běží jen v prohlížeči. Text, který napíšete, nikam neodchází.',

    playground: {
      heading: 'Vyzkoušejte',
      intro: 'Vyberte ukázku nebo napište vlastní text a zvolte, co se má s nalezenými údaji stát.',
      samplesLabel: 'Ukázkové texty (syntetická data)',
      samples: {
        'client-email': 'E-mail klienta',
        'advisor-note': 'Poznámka poradce',
        contract: 'Úryvek smlouvy',
        'hard-cases': 'Těžké případy',
      },
      textareaLabel: 'Text ke kontrole',
      modeLegend: 'Co udělat s nálezy',
      modes: {
        redact: {
          label: 'Začernění',
          hint: 'Každý nález nahradí jeho typ, např. [RODNÉ_ČÍSLO]. Původní hodnotu už nelze vrátit.',
        },
        pseudonymize: {
          label: 'Pseudonymizace',
          hint: 'Stejná hodnota dostane vždy stejný zástupný symbol, např. <OSOBA_1>, i ve skloňovaném tvaru. Mapa symbolů se hned zahodí.',
        },
        reversible: {
          label: 'Vratná pseudonymizace',
          hint: 'Jako pseudonymizace, ale mapa zůstane v paměti stránky. Odpověď modelu jde pak doplnit původními hodnotami. Ukázka je níže.',
        },
      },
      highlightedHeading: 'Nalezené údaje v textu',
      outputHeading: 'Co by odešlo do jazykového modelu',
      findingsHeading: 'Nálezy a proč je knihovna označila',
      columns: {
        type: 'Typ',
        text: 'Nalezený text',
        score: 'Skóre',
        detector: 'Zdroj',
        reasons: 'Důvody',
      },
      detectors: {
        rules: 'pravidla',
        ner: 'NER model',
        'rules+ner': 'pravidla i NER',
      } as Record<string, string>,
      none: 'V textu nebyly nalezeny žádné osobní údaje.',
      count: (n: number) => `Nálezů: ${n}`,
      minScoreNote: (score: string) =>
        `Zobrazují se nálezy se skóre aspoň ${score}. Skóre vychází z formátu, kontrolních součtů a okolních slov.`,
    },

    ner: {
      heading: 'Volitelně: NER model pro jména',
      intro:
        'Pravidla hledají jména podle slovníku, oslovení a koncovek. Malý model pro rozpoznávání jmen (NER) může doplnit ta, která pravidla minou. Používá se jen pro jména osob.',
      load: (size: string) => `Načíst NER model (${size})`,
      downloadNote: (runtime: string) =>
        `Stáhne se až po kliknutí: soubory modelu z huggingface.co a běhové prostředí ONNX Runtime pro WebAssembly z tohoto webu (${runtime} nekomprimovaně, při přenosu obvykle méně). Text, který analyzujete, zůstává v prohlížeči.`,
      loading: 'Stahuji a připravuji model…',
      progress: (loaded: string, total: string) => `Soubory modelu: ${loaded} z ${total}`,
      ready: 'Model je připravený a běží v prohlížeči (WebAssembly).',
      runtimeMeasured: (bytes: string) =>
        `Běhové prostředí ONNX Runtime: přeneseno ${bytes} (měřeno prohlížečem).`,
      use: 'Použít NER pro jména',
      analysing: 'NER analyzuje text…',
      error: 'Model se nepodařilo načíst. Detekce dál běží jen s pravidly.',
      attribution:
        'Model small-e-czech-finetuned-ner-wikiann (autor richielo, licence CC BY 4.0) vychází z modelu Seznam/small-e-czech (CC BY 4.0), převod do ONNX onnx-community. Trénovaný na datech WikiAnn z Wikipedie, ne na komunikaci klientů.',
      revision: (rev: string) => `Revize modelu: ${rev}`,
    },

    reversible: {
      heading: 'Vratná pseudonymizace: do modelu a zpět',
      intro:
        'Do jazykového modelu odejde jen text se zástupnými symboly. Jeho odpověď se pak doplní původními hodnotami lokálně, v prohlížeči. Mapa symbolů nikdy neopustí stránku.',
      steps: {
        original: '1. Původní text',
        masked: '2. Odchází do modelu',
        reply: '3. Odpověď modelu',
        restored: '4. Doplněno lokálně',
      },
      simulatedBadge: 'Simulovaná odpověď: šablona v kódu, ne výstup jazykového modelu',
      simulatedNote:
        'Tady jde jen o cestu dat. Skutečné volání modelu se stejnou ochranou ukazuje modul Agent pod kontrolou:',
      simulatedNoteLink: 'scénář Rodné číslo v dotazu',
      mapHeading: 'Mapa zástupných symbolů (jen v paměti této stránky)',
      mapColumns: { placeholder: 'Symbol', type: 'Typ', original: 'Původní hodnota' },
      mapNote: 'Mapa se nikam neukládá ani neodesílá. Po obnovení stránky zmizí.',
      unknown: (list: string) =>
        `Odpověď obsahuje symboly, které tato stránka nevydala: ${list}. Zůstaly beze změny.`,
      limitation:
        'Omezení: doplní se tvar z původního textu, takže pád nemusí sedět (např. „Dobrý den, Jan Dvořák“ místo „Dobrý den, pane Dvořáku“).',
      empty: 'V textu nejsou osobní údaje, není co pseudonymizovat. Vyberte některou ukázku výše.',
      traceTitle: 'Trace: co se stalo (bez osobních údajů)',
      reply: {
        greeting: (person?: string) => (person ? `Dobrý den, ${person},` : 'Dobrý den,'),
        thanks: 'děkujeme za Vaši zprávu.',
        sentences: {
          PERSON: (x: string) => `Kopii odpovědi posíláme také ${x}.`,
          RODNE_CISLO: (x: string) => `Ověřili jsme klienta s rodným číslem ${x}.`,
          ADDRESS: (x: string) => `Dopis odešleme na adresu ${x}.`,
          PHONE: (x: string) => `V případě dotazů Vám zavoláme na číslo ${x}.`,
          EMAIL: (x: string) => `Potvrzení pošleme na ${x}.`,
          BANK_ACCOUNT: (x: string) => `Změnu účtu na ${x} provedeme do tří pracovních dnů.`,
          IBAN: (x: string) => `Platby z účtu ${x} jsme spárovali se smlouvou.`,
          ICO: (x: string) => `Údaje k IČO ${x} jsme doplnili do smlouvy.`,
          DIC: (x: string) => `DIČ ${x} uvedeme na potvrzení.`,
          ID_CARD: (x: string) => `Doklad č. ${x} jsme zaevidovali.`,
          PASSPORT: (x: string) => `Pas č. ${x} jsme zaevidovali.`,
          PSC: (x: string) => `Zásilky půjdou na PSČ ${x}.`,
        } satisfies Record<PiiType, (x: string) => string>,
        closing: 'S pozdravem\nVáš poradce',
      },
    },

    eval: {
      heading: 'Jak přesná je detekce',
      intro:
        'Čísla pocházejí z evalu nad syntetickým korpusem (soubor evals/pii/results.json). Vytváří je skript, ne člověk, a CI kontroluje, že odpovídají aktuálnímu kódu.',
      warning:
        'Syntetická data výkon nadhodnocují. Šablony korpusu i detektory psal stejný autor a skutečná komunikace klientů je pestřejší: překlepy, chybějící diakritika, neobvyklá jména a formáty. Čísla ukazují, že detektory dělají, co mají. Neukazují, jak by si vedly v provozu.',
      configLegend: 'Konfigurace',
      configs: { rules: 'Jen pravidla', 'rules+ner': 'Pravidla + NER model' },
      noNer: 'Výsledky s NER modelem zatím nejsou k dispozici.',
      caption: (config: string) => `Výsledky na testovací části korpusu – ${config}`,
      columns: {
        type: 'Typ údaje',
        support: 'Výskytů',
        precision: 'Přesnost',
        recall: 'Úplnost',
        f1: 'F1',
        overlapF1: 'F1 (částečná shoda)',
      },
      micro: 'Celkem',
      metricsNote:
        'Přesnost = kolik nálezů bylo správně. Úplnost = kolik skutečných údajů se našlo. F1 = jejich harmonický průměr. Počítá se přesná shoda (stejný typ i hranice). Částečná shoda stačí, když se nález s údajem aspoň překrývá.',
      leakageHeading: 'Kolik osobních údajů by uniklo do modelu',
      leakage: (leaked: string, total: string, rate: string) =>
        `${leaked} z ${total} osobních údajů by zůstalo úplně nezamaskovaných (${rate}).`,
      leakagePartial: (partial: string) => `Jen částečně zamaskovaných: ${partial}.`,
      leakageNote:
        'Únik se počítá bez ohledu na typ: když se rodné číslo zamaskuje jako telefon, do modelu stejně neodejde.',
      personHeading: 'Jména: pravidla, model a obojí',
      personRows: {
        rules: 'Jen pravidla',
        ner: 'Jen NER model',
        both: 'Pravidla + NER',
      },
      // Chosen by the component from the actual numbers, so the text cannot contradict them.
      personNoteModelWeaker:
        'Samotný model vychází hůř než pravidla: učil se na Wikipedii, ne na dopisech a smlouvách. Jako druhá vrstva ale doplní jména, která pravidla minou. Proto jdou deterministická pravidla první a model je jen doplněk.',
      personNoteModelStronger:
        'Samotný model vychází na tomto korpusu lépe než pravidla. Kombinace s pravidly ale přidává vysvětlitelné důvody a validaci identifikátorů, které model nedělá.',
      errorsHeading: 'Ukázky chyb na testovací části',
      errorsIntro: 'Nejvýš pět ukázek na typ a druh chyby, zvýrazněný úsek je v ⟦závorkách⟧.',
      noErrors: 'Žádné chyby.',
      kinds: { false_negative: 'Nenalezeno', false_positive: 'Falešný nález' },
      notes: {
        missed: 'chybí úplně',
        partial: 'jen část',
        wrong_type: 'jiný typ',
        spurious: 'navíc',
      },
      provenanceHeading: 'Původ čísel',
      provenance: {
        generatedAt: 'Vygenerováno',
        test: (docs: number, spans: number, seed: number) =>
          `${docs} textů, ${spans} osobních údajů (seed ${seed})`,
        testLabel: 'Testovací část',
        dev: (docs: number) =>
          `${docs} textů z oddělené vývojové části, na které se detektory ladily`,
        devLabel: 'Ladění',
        library: 'Knihovna',
        nerModel: 'NER model',
        nerValue: (id: string, revision: string, date: string) =>
          `${id}, revize ${revision}, predikce z ${date}`,
      },
    },

    limits: {
      heading: 'Co detekce neumí',
      items: [
        'Jména psaná malými písmeny nebo bez diakritiky („jana novakova“) pravidla nenajdou.',
        'Vzácná jména mimo seznam MV ČR najde jen podle kontextu (oslovení, podpis, koncovka).',
        'Data narození, zdravotní údaje a další zvláštní kategorie volným textem nehledá.',
        'Zahraniční formáty (kromě IBAN) a adresy bez čísla domu nezná.',
        'Pseudonymizace nechrání před odvozením z kontextu: „ředitel pobočky v Kolíně“ může stačit k identifikaci.',
      ],
    },

    managed: {
      heading: 'Kdy použít tohle a kdy spravovanou službu',
      prosLabel: 'Výhody',
      consLabel: 'Nevýhody',
      own: {
        heading: 'Vlastní knihovna jako tato',
        pros: [
          'Data neopouštějí zařízení ani vlastní infrastrukturu.',
          'Každý nález má důvod a pravidlo, které jde otestovat.',
          'České identifikátory s validací kontrolních součtů (RČ, IČO, účet).',
          'Žádné náklady za volání a žádná závislost na dodavateli.',
        ],
        cons: [
          'Jména a volný text pokrývá jen slovník a heuristiky.',
          'Údržbu, evaly a aktualizace číselníků musí zajistit vlastní tým.',
          'Ověřeno jen na syntetických datech.',
        ],
      },
      managedService: {
        heading: 'Spravovaná služba pro detekci osobních údajů',
        pros: [
          'Širší pokrytí typů údajů a jazyků, modely udržuje poskytovatel.',
          'Provozní podpora a smluvně garantovaná dostupnost.',
        ],
        cons: [
          'Text musí odejít k poskytovateli. Je potřeba smluvní a regulatorní posouzení, kde a jak se zpracovává.',
          'Platí se za objem a české identifikátory nemusí validovat. Je potřeba ověřit na vlastních datech.',
          'Rozhodnutí modelu se hůř vysvětlují.',
        ],
      },
      recommendation:
        'V praxi se vrstvy kombinují: deterministické validátory jako první vrstva přímo u dat, model nebo služba pro jména a volný text, a obojí ověřené evalem na vlastních, anonymizovaných datech. Konkrétní podobu v podnikovém prostředí popisuje dokumentace (připravuje se ve fázi 5).',
    },
  },

  agent: {
    notice:
      'Odpovědi modelu jsou předem nahrané. Všechno ostatní (smyčka agenta, pravidla, nástroje i pseudonymizace) běží živě ve vašem prohlížeči. Fondy jsou fiktivní a nic se nikam neodesílá.',
    run: {
      heading: 'Spusťte scénář',
      intro:
        'Vyberte scénář a pusťte ho s pojistkami zapnutými, pak vypnutými. Model i prompt jsou stejné, liší se jen vrstva pravidel.',
      scenarioLegend: 'Scénář',
      guardrailsLegend: 'Pojistky (guardrails)',
      guardrailsOn: 'Zapnuté',
      guardrailsOff: 'Vypnuté',
      persona: 'Role',
      personas: { klient: 'klient', poradce: 'poradce' },
      userMessage: 'Dotaz uživatele',
      start: 'Spustit',
      running: 'Běží…',
      notRecorded: 'Tato kombinace zatím nebyla nahrána.',
    },
    scenarios: agentScenarios,
    provenance: {
      label: 'Původ odpovědí',
      recorded: 'Skutečný výstup modelu',
      fixture: 'Testovací fixture: ručně psaná data, ne výstup modelu',
      noModel: 'Model nebyl volán: odpověděla pravidla.',
      model: 'Model',
      provider: 'Rozhraní',
      providers: agentProviders,
      recordedAt: 'Nahráno',
      promptVersion: 'Verze promptu',
      claudeCodeNote:
        'Nahráno přes Claude Code CLI s předplatným, ne přes Claude API. Model dostal konverzaci jako JSON a nástroje volal strukturovaným výstupem, ne nativním tool use, takže na injekci ve výsledku nástroje může reagovat jinak. Režim s vlastním klíčem používá nativní tool use.',
    },
    result: {
      heading: 'Výsledek',
      empty: 'Zatím nic neběželo.',
      replayLabel: 'Nahraný běh',
      liveLabel: 'Živý běh s vaším klíčem',
      user: 'Uživatel',
      assistant: 'Asistent',
      status: agentStatus,
      draftHeading: 'Koncept e-mailu',
      draftNotSent: 'Neodesláno',
      draftTo: 'Komu',
      draftSubject: 'Předmět',
      roles: { klient: 'klient', kolega: 'kolega', compliance: 'compliance' },
      errors: agentErrors,
      traceTitle: 'Záznam kroků (trace)',
    },
    approval: {
      heading: 'Schválení akce',
      intro: 'Agent chce připravit koncept e-mailu. Nic se neodesílá, jde jen o koncept.',
      recordedDecision: 'Rozhodnutí při nahrávání',
      decisions: { approved: 'Schváleno', rejected: 'Zamítnuto' },
      decidedBy: {
        author: 'autor při nahrávání',
        flag: 'předvolba nahrávacího skriptu',
        user: 'vy',
      },
      continue: 'Pokračovat',
      approve: 'Schválit',
      reject: 'Zamítnout',
    },
    byok: {
      summary: 'Vlastní dotaz s vlastním API klíčem (volitelné)',
      intro:
        'Pustí stejný agent loop se živým modelem. Volání jde z vašeho prohlížeče přímo do API Anthropic a platíte ho vy.',
      warnings: [
        'Klíč zůstane jen v paměti této stránky. Neukládá se, nejde nikam jinam než do API Anthropic a zmizí po opuštění stránky nebo tlačítkem „Zapomenout klíč“.',
        'Anthropic doporučuje volat API z backendu. Přímé volání z prohlížeče je vhodné pro vývoj a zkoušení: použijte klíč s krátkou platností (např. 3 hodiny) ve zvláštním workspace se spend limitem.',
        'Organizace se zero data retention nebo Compliance API volání z prohlížeče nepovolují.',
      ],
      sourceLink: 'Dokumentace Anthropic: aplikace v prohlížeči',
      keyLabel: 'API klíč Anthropic',
      queryLabel: 'Dotaz',
      personaLegend: 'Role',
      model: (model: string) => `Model: ${model}`,
      start: 'Spustit s vlastním klíčem',
      forget: 'Zapomenout klíč',
    },
    rules: {
      heading: 'Pravidla',
      intro:
        'Pravidla jsou samostatná vrstva v kódu, ne prosba v promptu. Každé rozhodnutí je v záznamu kroků (trace) s pravidlem a důvodem.',
      items: agentRules,
    },
    limits: {
      heading: 'Co demo neumí',
      items: [
        'Heuristiky pro prompt injection a investiční doporučení zachytí zjevné případy, ne všechny. Proto na nich nestojí akce s dopadem: ty hlídá allowlist a schválení člověkem.',
        'Roli tady přepínáte ručně. Ve skutečné aplikaci by ji určilo přihlášení uživatele.',
        'Nahrávky vznikly jedním modelem v jednom čase. Jiný model nebo jiná verze se může chovat jinak.',
        'Koncept e-mailu se nikam neodesílá a demo nemá žádný nástroj, který by mohl něco odeslat.',
      ],
    },
  },

  local: {
    notice:
      'Všechno běží ve vašem prohlížeči. Soubor nikam neodchází a panel Síťová aktivita dole to dokládá.',
    pick: {
      heading: '1. Vyberte aktivitu',
      intro:
        'Zkuste ukázku, nebo nahrajte vlastní záznam z hodinek či sportovní aplikace (GPX, TCX nebo FIT).',
      samplesLabel: 'Ukázky',
      samples: {
        run: { title: 'Večerní běh', detail: 'GPX · 6 km' },
        ride: { title: 'Vyjížďka na kole', detail: 'TCX · 25 km' },
        intervals: { title: 'Intervaly', detail: 'FIT · 6 × 2 min' },
      },
      week: 'Celý týden (všechny tři)',
      syntheticNote:
        'Ukázky jsou syntetické: smyšlený sportovec, smyšlené hodinky a trasy, které nesledují ulice.',
      drop: 'Přetáhněte sem soubor, nebo',
      browse: 'ho vyberte z počítače',
      dropHint:
        'Můžete jich vybrat i víc najednou. Soubor čte jen tato stránka, nikam se nenahrává.',
      loadedLabel: 'Načtené aktivity',
      remove: (name: string) => `Odebrat ${name}`,
      reading: 'Čtu soubor…',
      errors: {
        unknown_format: 'Tohle není soubor GPX, TCX ani FIT.',
        invalid_file: 'Soubor se nepodařilo přečíst. Možná je poškozený.',
        no_points: 'V souboru nejsou body s časem.',
        too_large: 'Soubor je větší než 50 MB.',
      } satisfies Record<ParseErrorCode, string>,
      errorFor: (file: string, message: string) => `${file}: ${message}`,
      untitled: 'Aktivita',
    },
    sports: { run: 'běh', ride: 'kolo', other: 'jiný sport' } satisfies Record<Sport, string>,
    privacy: {
      heading: '2. Ochrana polohy',
      intro:
        'Začátek a konec trasy často prozradí, kde bydlíte. Proto je stránka ořízne hned po načtení, dřív než cokoli spočítá.',
      radius: 'Velikost privacy zone',
      radiusValue: (m: number) => (m === 0 ? 'vypnuto' : `${m} m`),
      trimmed: (start: string, end: string) =>
        `Skryto ${start} na začátku a ${end} na konci trasy.`,
      off: 'Privacy zone je vypnutá. Mapa i výpočty používají celou trasu.',
      allInside: 'Celá aktivita leží uvnitř zóny, nezbylo nic. Zónu zmenšete.',
      noGps: 'Soubor nemá polohu GPS, není co skrývat.',
      mapLabel: (name: string) =>
        `Trasa: ${name}. Vybledlé úseky jsou skryté, barva čáry ukazuje tepovou zónu.`,
      hidden: 'skryto',
      dropped: 'Ze souboru stránka zahodila:',
      droppedNone: 'Soubor neobsahoval žádné údaje o zařízení.',
      metadata: {
        device: 'název zařízení',
        manufacturer: 'výrobce',
        serialNumber: 'sériové číslo',
        softwareVersion: 'verzi firmwaru',
        application: 'aplikaci, která soubor vytvořila',
        author: 'jméno autora',
      } satisfies Record<MetadataKind, string>,
    },
    metrics: {
      heading: '3. Co spočítal kód',
      intro:
        'Tahle čísla počítají obyčejné funkce v JavaScriptu, žádná AI. Jsou přesná, opakovatelná a dají se otestovat.',
      distance: { label: 'Vzdálenost', hint: 'Součet vzdáleností mezi body GPS.' },
      moving: {
        label: 'Čas v pohybu',
        hint: (total: string) => `Bez zastávek. Celkem i se zastávkami ${total}.`,
      },
      pace: { label: 'Průměrné tempo', hint: 'Kolik minut v průměru trval jeden kilometr.' },
      speed: { label: 'Průměrná rychlost', hint: 'Počítá se z času v pohybu.' },
      climb: { label: 'Stoupání', hint: 'Součet všech stoupání. Změny pod 3 m jsou šum.' },
      hr: { label: 'Průměrný tep', hint: (max: number) => `Nejvyšší tep ${max} za minutu.` },
      trimp: {
        label: 'TRIMP',
        hint: 'Jedno číslo pro zátěž tréninku: délka × intenzita. Srovnávejte hlavně své vlastní tréninky.',
      },
      none: '—',
      noHr: 'Soubor nemá tep, zóny a TRIMP proto chybí.',
    },
    hr: {
      heading: 'Tepové zóny',
      intro:
        'Zóny jsou pásma podle procent maximálního tepu (50–60–70–80–90 %). Zóna 2 je klidná vytrvalost, zóna 5 je naplno.',
      settings: 'Vaše hodnoty',
      sampleValues: 'Předvyplněno hodnotami smyšleného sportovce z ukázek. Zadejte své.',
      maxHr: 'Maximální tep',
      useAge: 'Maximální tep neznám, odhadněte ho z věku',
      age: 'Věk',
      estimate: (value: number) => `Odhad 220 − věk = ${value} tepů za minutu.`,
      estimateWarning:
        'Je to jen hrubý odhad. Skutečné maximum se u jednotlivce může výrazně lišit, zóny pak berte orientačně.',
      restHr: 'Klidový tep',
      restHint: 'Změřte ho ráno po probuzení, ještě vleže.',
      coefficient: 'Vzorec TRIMP',
      coefficients: { male: 'pro muže', female: 'pro ženy' } satisfies Record<
        TrimpCoefficient,
        string
      >,
      coefficientHint: 'Banister kalibroval vzorec zvlášť pro muže a pro ženy.',
      bpm: 'tepů/min',
      zonesLabel: 'Čas v zónách',
      zone: (n: number) => (n === 0 ? 'pod zónou 1' : `zóna ${n}`),
      zoneNames: ['odpočinek', 'velmi lehká', 'lehká', 'střední', 'náročná', 'maximální'],
      sources:
        'Zdroje: zóny podle Edwards (1993), TRIMP podle Banister (1991) a Morton, Fitz-Clarke a Banister (1990), obojí jak je popisuje Shaw a kol. (2020). Vzorec 220 − věk zavedl Fox a kol. (1971), jeho slabiny popsali Robergs a Landwehr (2002).',
    },
    week: {
      heading: 'Týdenní zátěž',
      intro: 'TRIMP po dnech za posledních 7 dní, které nahrané aktivity pokrývají.',
      total: (sum: number) => `Celkem TRIMP ${sum}.`,
      acwrLabel: 'ACWR (poměr zátěže tohoto týdne k průměru posledních 4 týdnů)',
      acwrInsufficient: (days: number) =>
        `ACWR potřebuje aspoň 4 týdny záznamů. Teď pokrývají ${days} ${days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'}.`,
      acwrValue: (ratio: string) => `ACWR ${ratio}`,
      acwrNote:
        'Pozor, ACWR je sporný ukazatel (Gabbett 2016, kritika Impellizzeri a kol. 2020). Berte ho jako zajímavost, ne jako verdikt.',
      chartLabel: 'TRIMP po dnech',
    },
    payload: {
      heading: '4. Co uvidí AI',
      intro:
        'Model nedostane váš soubor. Dostane jen tento souhrn: žádné souřadnice, žádné časy, žádné zařízení ani název aktivity. Souhrn skládá kód z ověřeného schématu, nic jiného se do něj nedostane.',
      file: 'Váš soubor',
      fileDetail: (points: string) => `${points} bodů trasy`,
      model: 'Model dostane',
      modelDetail: 'souhrnná čísla, žádná poloha ani čas',
      jsonLabel: 'Přesně tohle jde do modelu (u vlastní otázky se přidá ještě ona)',
      promptLabel: 'Pokyny pro model (systémový prompt)',
    },
    coach: {
      heading: '5. AI trenér',
      intro:
        'Malý jazykový model se jednou stáhne do prohlížeče a pak běží na grafické kartě vašeho počítače. Bez účtu, bez API klíče, zdarma.',
      checking: 'Zjišťuji, jestli prohlížeč umí WebGPU…',
      gpu: (label: string) => `Model poběží na grafice: ${label}.`,
      gpuUnknown: 'Prohlížeč umí WebGPU, model poběží na grafické kartě.',
      unsupported: {
        no_api: 'Váš prohlížeč neumí WebGPU, takže tady jazykový model nespustíme.',
        no_adapter: 'Prohlížeč WebGPU zná, ale nenašel použitelnou grafickou kartu.',
      },
      unsupportedHint:
        'Zkuste aktuální Chrome nebo Edge na počítači. Zatím níže vidíte shrnutí, které složila pravidla v kódu.',
      modelLegend: 'Velikost modelu',
      models: {
        small: { label: 'Menší', detail: '0,6 miliardy parametrů · rychlejší, horší čeština' },
        large: { label: 'Větší', detail: '1,7 miliardy parametrů · pomalejší, lepší čeština' },
      } satisfies Record<CoachModelKey, { label: string; detail: string }>,
      download: (size: string) => `Stáhnout a spustit (${size})`,
      start: 'Spustit (už je stažený)',
      downloadNote: 'Stahuje se jen jednou, pak zůstane uložený v prohlížeči. Doporučujeme Wi-Fi.',
      loading: 'Načítám model…',
      progress: (percent: number) => `${percent} %`,
      ready: (name: string) => `${name} běží ve vašem prohlížeči.`,
      selectFirst: 'Nejdřív vyberte aktivitu.',
      explain: 'Vysvětlit trénink',
      stop: 'Zastavit',
      writing: 'Píšu…',
      speed: (tokensPerSecond: string) => `${tokensPerSecond} tokenů za sekundu`,
      answerLabel: 'AI trenér',
      questionLabel: (question: string) => `Otázka: ${question}`,
      caution: 'Malý model se může mýlit. Platí čísla výše, ta spočítal kód.',
      templateLabel: 'Shrnutí z pravidel (bez AI)',
      askHeading: 'Zeptejte se trenéra',
      askLabel: 'Vaše otázka',
      askPlaceholder: 'Například: Jak se příště zlepšit?',
      ask: 'Zeptat se',
      suggestions: ['Byl to náročný trénink?', 'Na co se příště zaměřit?', 'Co znamená zóna 4?'],
      askHint:
        'Otázka jde jen do modelu ve vašem prohlížeči. Jména, telefony a podobné údaje ještě předtím zakryje knihovna pii-cz z modulu 2.',
      redacted: (count: number) => `Před předáním modelu zakryto osobních údajů: ${count}.`,
      delete: 'Smazat model z prohlížeče',
      deleted: 'Model je smazaný. Příště se stáhne znovu.',
      errors: {
        webgpu: 'Prohlížeč neumí WebGPU.',
        shader_f16: 'Grafika nepodporuje potřebnou funkci. Zkuste to prosím znovu.',
        memory: 'Grafická karta nemá na tento model dost paměti. Zkuste menší model.',
        storage: 'V prohlížeči není dost místa na uložení modelu.',
        network: 'Stahování se přerušilo. Zkontrolujte připojení a zkuste to znovu.',
        unknown: 'Model se nepodařilo spustit.',
        generation: 'Model při psaní narazil na chybu. Zkuste to znovu.',
      } satisfies Record<LoadErrorKind | 'generation', string>,
      credits: (version: string) =>
        `Modely Qwen3 (licence Apache-2.0) přes knihovnu WebLLM ${version}. Váhy i knihovny jsou připnuté na konkrétní verzi.`,
    },
    template: {
      overview: (sport: string, km: string | null, minutes: number, moving: number | null) =>
        km === null
          ? `Trénink (${sport}) trval ${minutes} min.`
          : `Trénink (${sport}): ${km} km za ${minutes} min${moving !== null && moving < minutes ? `, z toho ${moving} min v pohybu` : ''}.`,
      pace: (pace: string) => `Průměrné tempo ${pace} min/km.`,
      speed: (speed: string) => `Průměrná rychlost ${speed} km/h.`,
      climb: (m: number) => `Stoupání celkem ${m} m.`,
      dominantZone: (percent: number, zone: number, name: string) =>
        `Nejvíc času (${percent} %) bylo srdce v zóně ${zone}, tedy ${name} intenzita.`,
      highIntensity: (percent: number) =>
        `Ve vysoké intenzitě (zóny 4 a 5) uběhlo ${percent} % času.`,
      noHighIntensity: 'Do zón 4 a 5 se trénink nedostal, šlo o klidnější zátěž.',
      trimp: (value: number) =>
        `TRIMP vyšel ${value}. Srovnávejte ho hlavně se svými dalšími tréninky.`,
      estimated: 'Maximální tep je odhad z věku, zóny proto berte orientačně.',
      week: (count: number, sum: number) =>
        `Za týden: ${count} ${count < 5 ? 'aktivity' : 'aktivit'}, TRIMP celkem ${sum}.`,
      noHr: 'Bez tepu nejde říct, jak náročný trénink byl.',
    },
    network: {
      heading: '6. Síťová aktivita',
      intro:
        'Tohle je důkaz. Prohlížeč zapisuje každý síťový požadavek stránky a tady je vidíte všechny.',
      counterLabel: 'Od výběru souboru odešlo požadavků',
      beforeFile: 'Zatím jste nevybrali žádnou aktivitu.',
      zero: 'Nula. Vaše data neopustila zařízení.',
      nonZero: 'Po výběru souboru proběhly požadavky. Jsou vypsané níže, ať vidíte, kam šly.',
      phases: {
        page: 'Načtení stránky',
        model: 'Stažení modelu',
        afterFile: 'Po výběru souboru',
      } satisfies Record<NetworkPhase, string>,
      phaseHints: {
        page: 'Kód a styly tohoto webu.',
        model: 'Jen stahování modelu do prohlížeče. Spouští ho až vaše kliknutí.',
        afterFile: 'Tady by se objevilo cokoli, co by mohlo odnést vaše data.',
      } satisfies Record<NetworkPhase, string>,
      requests: (count: number) =>
        `${count} ${count === 1 ? 'požadavek' : count >= 2 && count <= 4 ? 'požadavky' : 'požadavků'}`,
      listLabel: 'Seznam požadavků',
      worker: 'model',
      caveat:
        'Měření používá PerformanceObserver. Nevidí úplně všechno, třeba požadavky rozšíření prohlížeče. Ověřte si to i sami: klávesa F12 → karta Síť (Network).',
    },
    limits: {
      heading: 'Co tohle demo neumí',
      items: [
        'Privacy zone ořezává jen začátek a konec. Když trasa uprostřed projde kolem domova, ten úsek zůstane.',
        'Pevný kruh jde na veřejně sdílené mapě zpětně dopočítat ze dvou míst, kde trasa „začíná“. V produkci by se střed zóny náhodně posouval.',
        'Metriky jsou zjednodušené: prahy pro pohyb a stoupání jsou zvolené, ne změřené, a vzdálenost se počítá na kouli.',
        'Malý model píše česky s chybami a může si vymýšlet. Neslouží jako trenér ani lékař.',
      ],
    },
    traceSummary: 'Pod kapotou: záznam kroků',
    traceTitle: 'Záznam kroků',
  },

  glossary: {
    label: 'Pojmy:',
    close: 'Zavřít',
    terms: glossaryTerms,
    byModule: {
      intake: ['llm', 'rag', 'agent', 'hitl', 'aiAct', 'adr'],
      pii: ['personalData', 'pseudonymization', 'ner', 'eval'],
      agent: ['agent', 'guardrails', 'promptInjection', 'token', 'trace', 'replay', 'byok'],
      local: ['slm', 'webgpu', 'token', 'privacyZone', 'trimp'],
    } satisfies Record<ModuleId, TermId[]>,
  },

  placeholder: {
    moduleOf: (n: number, total: number) => `Modul ${n} ze ${total}`,
    notice: 'Tento modul se připravuje. Níže je popsané, co bude umět.',
    willDoHeading: 'Co modul bude dělat',
    proofHeading: 'Co tím dokazuji',
    storyNav: 'Navigace mezi moduly',
    prev: 'Předchozí modul',
    next: 'Další modul',
    backHome: 'Zpět na úvod',
  },

  trace: {
    defaultTitle: 'Záznam kroků (trace)',
    empty: 'Zatím žádné události.',
    copy: 'Zkopírovat trace jako JSON',
    copied: 'Trace je zkopírovaný do schránky.',
    copyFailed: 'Kopírování se nepodařilo. JSON můžete zkopírovat ručně z pole níže.',
    manualCopyLabel: 'Trace jako JSON',
    summary: 'Souhrn',
    eventCount: 'Událostí',
    tokens: 'Tokeny (vstup / výstup)',
    totalLatency: 'Součet latencí',
    step: 'Krok',
    latency: 'Latence',
    model: 'Model',
    rule: 'Pravidlo',
    details: 'Vstup a výstup',
    input: 'Vstup',
    output: 'Výstup',
    recordedSuffix: 'nahráno',
    types: {
      llm_call: 'Volání modelu',
      tool_call: 'Volání nástroje',
      policy_decision: 'Rozhodnutí pravidel',
      pii: 'Ochrana dat',
      error: 'Chyba',
      info: 'Informace',
    },
    decisions: {
      allow: 'Povoleno',
      deny: 'Zamítnuto',
      require_approval: 'Vyžaduje schválení',
      modify: 'Upraveno',
    },
  },

  disclaimer: {
    heading: 'Upozornění',
    items: [
      'Technické demo. Nejde o investiční, právní ani zdravotní doporučení.',
      'Bez vazby na zmíněné společnosti. Všechna data jsou syntetická a fondy fiktivní.',
      'Klasifikace podle AI Act je pouze orientační.',
    ],
  },

  footer: {
    github: 'GitHub',
    docs: 'Dokumentace',
    license: 'Licence MIT',
  },

  notFound: {
    title: 'Stránka nenalezena',
    text: 'Tahle adresa v ukázce neexistuje.',
    back: 'Zpět na úvod',
  },

  error: {
    title: 'Něco se pokazilo',
    text: 'Část stránky se nepodařilo načíst. Nejčastěji pomůže stránku načíst znovu.',
    reload: 'Načíst znovu',
  },
} as const;
