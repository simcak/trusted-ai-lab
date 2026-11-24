# pii-cz

> **EN:** Detection and pseudonymisation of Czech personal data in free text: rodné číslo (birth
> number), IČO/DIČ, bank accounts, IBAN, phone, e-mail, PSČ, ID card / passport numbers, addresses
> and person names. Identifiers are validated by their checksums, not just matched by regex. Every
> finding carries a score and machine-readable reasons. Three modes: redact, pseudonymize, and a
> reversible in-memory session for sending text to an LLM and re-identifying the answer locally.
> Zero runtime dependencies; optional NER via an injected classifier.

Knihovna pro detekci a pseudonymizaci českých osobních údajů. Používá ji stránka
[`#/pii`](../../apps/web/src/modules/pii/) a v dalších fázích agent a lokální trenér.

```ts
import { createPseudonymizer, detect, pseudonymize, redact } from '@trusted-ai-lab/pii-cz';

const text = 'Jan Novák, r.č. 850101/1233, tel. +420 605 123 456';
const findings = detect(text);
// [{ type: 'PERSON', text: 'Jan Novák', score: 0.85, reasons: ['first_name_dictionary', …] }, …]

redact(text, findings); // „[OSOBA], r.č. [RODNÉ_ČÍSLO], tel. [TELEFON]"
pseudonymize(text, findings).text; // „<OSOBA_1>, r.č. <RODNÉ_ČÍSLO_1>, tel. <TELEFON_1>"

// Vratně: mapa existuje jen v uzávěru `session`, nikam se neukládá.
const session = createPseudonymizer();
const masked = session.pseudonymize(text, findings).text; // → do LLM
session.reidentify('Dobrý den, <OSOBA_1>, …').text; // → „Dobrý den, Jan Novák, …"
```

## Co detekuje a jak

| Typ                          | Validace                                                                                                                 | Zdroj pravidla                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `RODNE_CISLO`                | s lomítkem i bez; 10 číslic dělitelných 11, 9 číslic před 1954; měsíc +50 (ženy), +20/+70 (doplňková řada); platné datum | zákon 133/2000 Sb. § 13, [MV ČR](https://mv.gov.cz/rodne-cislo-obecne); výjimka zbytku 10 a rok 2004 jsou `TODO(verify)` |
| `ICO`, `DIC`                 | vážený součet mod 11; DIČ = CZ + IČO / rodné číslo / řada 699                                                            | `TODO(verify)` (OQ-07, OQ-08)                                                                                            |
| `BANK_ACCOUNT`               | předčíslí i číslo s vahami mod 11, kód banky proti číselníku ČNB                                                         | vyhláška ČNB 169/2011 Sb., [číselník ČNB](https://www.cnb.cz/cs/platebni-styk/ucty-kody-bank/)                           |
| `IBAN`                       | mod 97 (ISO 13616), u CZ délka 24 a vnitřní číslo účtu                                                                   | [ČNB – IBAN](https://www.cnb.cz/cs/platebni-styk/iban/iban-mezinarodni-format-cisla-uctu/)                               |
| `PHONE`                      | +420 / 00420, 9 číslic, skupiny 3-3-3 nebo 3-2-2-2; částky („… Kč") snižují skóre                                        | `TODO(verify)` první číslice 2–9                                                                                         |
| `EMAIL`                      | dot-atom + doménová jména, i zamaskované „(at)"                                                                          | —                                                                                                                        |
| `PSC`, `ID_CARD`, `PASSPORT` | formát; jen s kontextovým slovem („PSČ", „OP", „pas")                                                                    | `TODO(verify)` (OQ-09, OQ-10)                                                                                            |
| `ADDRESS`                    | heuristika ulice + číslo domu (+ PSČ + obec), „č. p."; „Praha 5" není adresa                                             | —                                                                                                                        |
| `PERSON`                     | křestní jméno ze seznamu MV ČR (i skloňované) + příjmení, oslovení / titul / role, koncovka -ová, podpis                 | [MV ČR – Seznam jmen](https://mv.gov.cz/seznam-jmen) (viz OQ-11)                                                         |

Kontextová slova („r.č.", „IČO", „tel.", „bytem"…) zvyšují skóre, výchozí práh je `0.5`. Překryvy se
řeší deterministicky: obsahující typ vyhrává (ADRESA ⊃ PSČ, IBAN ⊃ číslice, DIČ ⊃ IČO), jinak
rozhodne vyšší skóre a delší span.

## NER jako plugin

Knihovna žádný ML runtime neimportuje. Volající předá klasifikátor ve tvaru výstupu transformers.js
`token-classification` a knihovna se postará o zarovnání tokenů na text, ořez titulů a sloučení s
pravidly:

```ts
import { createNerDetector, detectAsync } from '@trusted-ai-lab/pii-cz';

const ner = createNerDetector((text) => pipelineFromTransformersJs(text), { weight: 0.8 });
const findings = await detectAsync(text, [ner]);
```

## Eval

`@trusted-ai-lab/pii-cz/eval` počítá strict / overlap precision, recall a F1 po typech a únik
(„leakage"), tj. kolik osobních údajů by zůstalo nezamaskovaných. Výsledky nad syntetickým korpusem
jsou v [`evals/pii/`](../../evals/README.md). **Syntetická data reálný výkon nadhodnocují.**

## Omezení

- Jména psaná malými písmeny nebo bez diakritiky pravidla nenajdou.
- Vzácná jména mimo seznam MV pozná jen podle kontextu.
- Data narození, zdravotní údaje a další zvláštní kategorie volným textem nehledá.
- Re-identifikace vrací tvar z původního textu, takže pád v odpovědi modelu nemusí sedět.

## Build a licence

`pnpm --filter @trusted-ai-lab/pii-cz build` vytvoří `dist/` (JS + `.d.ts`) pro npm. Uvnitř monorepa
se importují přímo zdrojové `.ts`. Balíček je zatím `private`: název a zveřejnění rozhodne autor,
předtím je potřeba vyřešit licenci seznamu jmen (OQ-11). Kód má licenci MIT. Referenční data
(`src/data/`) nesou zdroj a datum stažení, obnovují se přes `pnpm fetch:pii-reference-data`.
