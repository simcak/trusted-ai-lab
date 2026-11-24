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
    legend: 'Tolerance chyb',
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
      'Model natrénovaný na vašich označených datech. Je levný v provozu, rychlý a jeho přesnost jde změřit.',
  },
  llm: {
    label: 'Jazykový model (jedno volání)',
    summary: 'Jedno volání modelu se strukturovaným výstupem, bez vyhledávání a bez nástrojů.',
  },
  rag: {
    label: 'RAG (vyhledávání + jazykový model)',
    summary:
      'Model odpovídá jen z dokumentů, které k dotazu najde vyhledávání, a odkazuje na zdroj.',
  },
  agent: {
    label: 'Agent',
    summary: 'Model volá nástroje v několika krocích. Každý krok hlídá samostatná vrstva pravidel.',
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
  'provider-terms': 'Smlouva s poskytovatelem modelu: bez tréninku na datech, region, uchování',
  'permission-aware-retrieval': 'Vyhledávání respektuje přístupová práva',
  'prompt-injection-defense': 'Ochrana proti prompt injection',
  'agent-guardrails': 'Guardrails agenta: povolené nástroje, rozpočet, audit',
  'action-approval': 'Schválení akcí člověkem',
  'human-intervention': 'Právo na lidský zásah a napadení rozhodnutí',
  dpia: 'Posouzení vlivu na ochranu osobních údajů (DPIA)',
  'human-oversight': 'Navržený lidský dohled',
  logging: 'Automatické logy událostí',
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

export const cs = {
  app: {
    name: 'Bezpečná AI v praxi',
    tagline: 'Od nápadu k bezpečnému nasazení',
    skipToContent: 'Přeskočit na obsah',
    mainNav: 'Moduly',
    loading: 'Načítám…',
  },

  landing: {
    lead: 'Čtyři interaktivní ukázky toho, jak architekt rozhoduje, jestli a jak nasadit AI tam, kde jde o citlivá data.',
    sublead:
      'Vše běží přímo v prohlížeči: bez instalace, bez API klíče a bez backendu. Výstupy modelů jsou předem nahrané, takže stránka funguje i bez připojení k AI službám.',
    storyHeading: 'Čtyři otázky v pořadí, v jakém si je klade architekt',
    proofLabel: 'Co tím dokazuji',
    openModule: (title: string) => `Otevřít modul ${title}`,
    moreHeading: 'Jak to je postavené',
    docsLink: 'Architektonická rozhodnutí a dokumentace',
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
        'Byznys popíše záměr a pravidlový engine navrhne architekturu: vhodný vzor, míru rizika a odhad nákladů.',
      proof:
        'Umím říct „tady AI nepotřebujete“ a každé doporučení zdůvodnit konkrétním pravidlem, které jde otestovat.',
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
        'Knihovna pii-cz najde české osobní údaje a nahradí je dřív, než text odejde do jazykového modelu.',
      proof:
        'Rozumím ochraně osobních údajů až na úroveň kódu: validace kontrolních součtů místo pouhých regulárních výrazů a měřená přesnost.',
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
        'Agent hledá ve fiktivních fondech a počítá poplatky. Každý jeho krok ale hlídá samostatná vrstva pravidel.',
      proof:
        'Umím navrhnout guardrails jako samostatnou, testovatelnou vrstvu: povolené nástroje, rozpočty, schvalování člověkem a auditní stopu.',
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
        'Trenérský asistent rozebere sportovní aktivitu a malý jazykový model výsledky vysvětlí přímo v prohlížeči.',
      proof:
        'Umím navrhnout řešení, kde citlivá data zařízení vůbec neopustí, a umím to také doložit.',
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
      'Bez jazykového modelu: doporučení skládají pravidla, každé s důvodem a odkazem na zdroj. Nic se nikam neodesílá.',
    presetsLabel: 'Ukázkové záměry',
    presets: intakePresets,
    formHeading: 'Popište záměr',
    descriptionLabel: 'Popis záměru',
    descriptionHint: 'Pravidla text nečtou, jen ho převezmou do ADR.',
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
        'Pravidla hledají jména podle slovníku, oslovení a koncovek. Malý model pro rozpoznávání pojmenovaných entit (NER) může doplnit jména, která pravidla minou. Používá se jen pro jména osob.',
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
      'Odpovědi modelu jsou nahrané. Agent loop, pravidla, nástroje i pseudonymizace běží živě ve vašem prohlížeči. Fondy jsou fiktivní a nic se nikam neodesílá.',
    run: {
      heading: 'Spusťte scénář',
      intro:
        'Vyberte scénář a pusťte ho se zapnutými i vypnutými guardrails. Se stejným modelem a stejným promptem se liší jen vrstva pravidel.',
      scenarioLegend: 'Scénář',
      guardrailsLegend: 'Guardrails',
      guardrailsOn: 'Zapnuté',
      guardrailsOff: 'Vypnuté',
      persona: 'Persona',
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
      traceTitle: 'Trace běhu',
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
      personaLegend: 'Persona',
      model: (model: string) => `Model: ${model}`,
      start: 'Spustit s vlastním klíčem',
      forget: 'Zapomenout klíč',
    },
    rules: {
      heading: 'Pravidla',
      intro:
        'Policy engine je samostatná vrstva, ne text v promptu. Každé rozhodnutí je v trace s pravidlem a důvodem.',
      items: agentRules,
    },
    limits: {
      heading: 'Co demo neumí',
      items: [
        'Heuristiky pro prompt injection a investiční doporučení zachytí zjevné případy, ne všechny. Proto na nich nestojí akce s dopadem: ty hlídá allowlist a schválení člověkem.',
        'Persona je přepínač. V produkci ji určí identita a role přihlášeného uživatele.',
        'Nahrávky vznikly jedním modelem v jednom čase. Jiný model nebo jiná verze se může chovat jinak.',
        'Koncept e-mailu se nikam neodesílá a demo nemá žádný nástroj, který by mohl něco odeslat.',
      ],
    },
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
    defaultTitle: 'Trace',
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
