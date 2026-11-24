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
        'Tady jde jen o cestu dat. Skutečné volání modelu se stejnou ochranou přibude v modulu Agent pod kontrolou.',
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
