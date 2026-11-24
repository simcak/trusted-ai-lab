# data

Pouze **syntetická data** a jejich generátory. Žádné reálné osoby, fondy ani data zaměstnavatele.

| Složka                  | Obsah                                                        | Fáze |
| ----------------------- | ------------------------------------------------------------ | ---- |
| [`pii/`](pii/README.md) | syntetický korpus PII se zlatými spany (`pnpm generate:pii`) | 1    |
| `pricing.json`          | ceník tokenů se zdrojem a datem (ručně, ověřeno, viz OQ-18)  | 2    |
| `funds.json`            | 8 fiktivních fondů pro modul 3 (ručně, viz níže)             | 3    |
| `activities/`           | ukázkové aktivity                                            | 4    |

`pricing.json` nejsou syntetická data, ale veřejné ceníky (Anthropic, OpenAI) přepsané ručně se
zdrojem a datem načtení. Schéma hlídá `PricingSchema` v `packages/intake-rules`, test ho ověřuje
v CI. Chybějící cena se zapíše jako `null` a stránka ukáže „cena neověřena“.

Referenční data knihovny `pii-cz` (seznam jmen MV ČR, číselník kódů bank ČNB) nejsou syntetická.
Proto jsou přímo v balíčku (`packages/pii-cz/src/data/`) se zdrojem a datem stažení
(`pnpm fetch:pii-reference-data`).

`funds.json` je napsaný ručně: osm fiktivních fondů (Fond Alfa … Fond Théta) s vymyšlenými
poplatky, rizikem SRI a popisem. Popis fondu Théta obsahuje **záměrně vloženou prompt injection**,
na které modul Agent pod kontrolou ukazuje karanténu výstupů nástrojů. Schéma hlídá `FundsFileSchema`
v `packages/agent-runtime` a test ověřuje, že injekci obsahuje právě jeden fond a že `pii-cz`
v datech fondů nic nenajde.
