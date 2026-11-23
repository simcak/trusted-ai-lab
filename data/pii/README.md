# Syntetický korpus PII (modul 2)

`corpus.json` generuje `generate.ts` (seedovaný `@faker-js/faker`, locale `cs_CZ`). **Pouze syntetická
data.** Hodnoty (rodná čísla, účty, IČO…) jsou náhodné a platné jen podle kontrolních součtů.
Shoda se skutečnou osobou, účtem nebo firmou je náhodná.

```bash
pnpm generate:pii            # přegeneruje corpus.json
pnpm generate:pii --check    # CI: selže, pokud commitnutý korpus neodpovídá generátoru
```

- **Rozdělení:** `dev` (100 textů) slouží k ladění detektorů. `test` (300 textů, jiný seed) se
  reportuje na stránce `#/pii`. Šablony obou částí jsou stejné, takže ani `test` není nezávislý vzorek.
  Výsledky jsou proto nadhodnocené.
- **Nezávislost:** generátor (`values.ts`, `names.ts`) nepoužívá validátory z `packages/pii-cz`.
  Kontrolní součty i skloňování má napsané zvlášť.
- **Šablony** (`templates.ts`) pokrývají e-maily klientů, poznámky poradce, úryvky smluv a záměrně
  těžké případy. Každý dokument nese tagy těžkých případů (`tags`).

## Konvence zlatých spanů

| Typ                    | Co je span                                                                                                   | Co span není                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `PERSON`               | jméno a příjmení, i ve skloňovaném tvaru („Janu Novákovi"), i samotné příjmení nebo oslovení křestním jménem | tituly (Ing., Ph.D.), oslovení (pan, paní, Vážený), role (klient) |
| `ADDRESS`              | ulice + číslo + PSČ + obec jako jeden span. Také ulice + číslo + obec a obec + č. p.                         | samotná obec, městská část („Praha 5", „pobočka Brno 2")          |
| `PSC`                  | samostatné PSČ mimo adresu („PSČ pro zásilky: 602 00")                                                       | PSČ uvnitř adresy (to je součást `ADDRESS`)                       |
| `RODNE_CISLO`          | s lomítkem i bez, 9 i 10 číslic                                                                              | číslo tvaru RČ s chybným kontrolním součtem („číslo smlouvy …")   |
| `ICO`, `DIC`           | IČO osoby i firmy, DIČ včetně `CZ`                                                                           | variabilní symbol, číslo objednávky                               |
| `BANK_ACCOUNT`, `IBAN` | celé číslo včetně předčíslí a kódu banky / celý IBAN i s mezerami                                            | částky                                                            |
| `PHONE`                | včetně předvolby +420 / 00420                                                                                | částky ve tvaru 3-3-3 („736 028 541 Kč")                          |
| `EMAIL`                | i zamaskovaný („jan.novak (at) seznam.cz") celý                                                              | —                                                                 |
| `ID_CARD`, `PASSPORT`  | jen číslo dokladu                                                                                            | slovo „OP" / „pas"                                                |

Názvy fondů („Fond Alfa"), bank a obcí nejsou osobní údaje a span nemají.
