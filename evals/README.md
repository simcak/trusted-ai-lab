# evals

Eval sady, skripty a výsledky (JSON), které čte web. Čísla vznikají **pouze během skriptu**. CI je
spouští bez API klíčů a bez sítě nad syntetickými daty a uloženými predikcemi.

## PII (`pii/`, modul 2)

| Soubor                 | Co to je                                                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run.ts`               | spustí `pii-cz` nad `data/pii/corpus.json` a zapíše `results.json`; `--check` v CI ověří, že commitnutý výsledek odpovídá kódu                                 |
| `results.json`         | metriky po typech (strict / overlap P, R, F1), únik („leakage") a ukázky chyb pro konfigurace `rules` a `rules+ner`; **jediný zdroj čísel na stránce `#/pii`** |
| `run-ner.ts`           | jen lokálně: stáhne NER model (~15 MB) a uloží jeho predikce                                                                                                   |
| `ner-predictions.json` | uložené predikce NER s ID modelu, připnutou revizí, verzí runtime, datem a hashem korpusu                                                                      |
| `ner-model.ts`         | jedna definice modelu pro eval i prohlížeč (stejná revize, stejné parametry)                                                                                   |
| `schema.ts`            | zod schémata všech souborů (validuje i web před zobrazením)                                                                                                    |

```bash
pnpm eval:pii        # přepočítá results.json (bez sítě)
pnpm eval:pii:ner    # lokálně: znovu nahraje NER predikce (síť), pak přepočítá results.json
pnpm evals:check     # CI: korpus i výsledky musí odpovídat kódu
```

Když se změní korpus, CI selže, dokud se NER predikce lokálně nenahrají znovu (nesedí hash korpusu).
Když se změní jen pravidla, `eval:pii` přepočítá „pravidla + NER" z uložených predikcí bez sítě.

**Syntetická data výkon nadhodnocují.** Šablony korpusu i detektory psal stejný autor a `dev` i
`test` vznikly ze stejných šablon. Čísla ukazují, že detektory dělají, co mají, ne jak by si vedly
na skutečné komunikaci klientů.

## Agent (`agent/recordings/`, modul 3)

Skutečné výstupy modelu pro 6 scénářů × guardrails ZAP/VYP: jeden soubor na běh
(`<scénář>.<on|off>.json`). Vznikají jen lokálně skriptem
[`scripts/record-agent.ts`](../scripts/record-agent.ts) s klíčem autora. Každý soubor nese model,
datum, verzi promptu, effort, limity pravidel, rozhodnutí člověka a u každého kroku otisk
požadavku (SHA-256), model, který krok obsloužil, a `request-id` z API.

```bash
pnpm record:agent                                    # lokálně: všech 12 běhů (placené API)
pnpm record:agent --only s1-bezny-dotaz --guardrails on
pnpm evals:check                                     # CI: přehraje nahrávky bez sítě a ověří otisky
```

Web z nahrávky bere jen odpovědi modelu a rozhodnutí člověka. Loop, pravidla, nástroje i `pii-cz`
běží živě. Když se změní cokoli, co jde do modelu (prompt, popisy a schémata nástrojů, data fondů,
texty pravidel, chování `pii-cz`), otisk přestane sedět a `--check` selže, dokud se dotčené scénáře
nenahrají znovu.
