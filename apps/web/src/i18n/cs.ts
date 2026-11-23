/**
 * All user-facing Czech texts. Components must not hard-code UI strings.
 * Keep claims honest (CLAUDE.md rule 8): placeholders describe what a module *will* do.
 */
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

  tracePreview: {
    heading: 'Náhled komponenty: časová osa trace',
    fixtureBadge: 'Testovací fixture: ručně psaná data, ne výstup modelu',
    description:
      'Takhle bude vypadat záznam běhu agenta. Data procházejí stejnou cestou jako budoucí skutečné nahrávky (ReplayProvider → trace → panel), ale jsou ručně připravená, ne vygenerovaná modelem.',
    provenance: 'Původ dat',
    model: 'Model',
    recordedAt: 'Datum',
    promptVersion: 'Verze promptu',
    run: 'Přehrát ukázku',
    running: 'Přehrávám…',
    clear: 'Vymazat',
    userMessage: 'Najdi akciové fondy s nízkými poplatky a pošli mi shrnutí e-mailem.',
    panelTitle: 'Trace ukázkového běhu',
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
