# data

Pouze **syntetická data** a jejich generátory. Žádné reálné osoby, fondy ani data zaměstnavatele.

| Složka                  | Obsah                                                        | Fáze |
| ----------------------- | ------------------------------------------------------------ | ---- |
| [`pii/`](pii/README.md) | syntetický korpus PII se zlatými spany (`pnpm generate:pii`) | 1    |
| `pricing.json`          | ceník se zdrojem a datem                                     | 2    |
| `funds.json`            | fiktivní fondy                                               | 3    |
| `activities/`           | ukázkové aktivity                                            | 4    |

Referenční data knihovny `pii-cz` (seznam jmen MV ČR, číselník kódů bank ČNB) nejsou syntetická.
Proto jsou přímo v balíčku (`packages/pii-cz/src/data/`) se zdrojem a datem stažení
(`pnpm fetch:pii-reference-data`).
