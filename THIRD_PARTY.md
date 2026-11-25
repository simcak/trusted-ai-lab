# Závislosti třetích stran

Před přidáním závislosti se ověřuje licence (povolené MIT / Apache-2.0 / BSD) a aktivní údržba.
Licence ověřena z metadat npm registru; „Vydáno" = datum vydání použité verze. Stav k 2026-11-25.

Instalace navíc hlídá `minimumReleaseAge` (3 dny) v `pnpm-workspace.yaml`. Verze mladší než 3 dny
se neinstalují, protože kompromitované releasy bývají odhaleny a staženy obvykle během pár dní.

## Runtime (jde do prohlížeče)

| Balíček              | Verze  | Licence | Vydáno     | Účel                                     |
| -------------------- | ------ | ------- | ---------- | ---------------------------------------- |
| `react`, `react-dom` | 19.3.1 | MIT     | 2026-10-14 | UI                                       |
| `react-router`       | 8.5.2  | MIT     | 2026-11-18 | `HashRouter` (GitHub Pages nemá rewrite) |
| `zod`                | 4.6.7  | MIT     | 2026-10-12 | Validace dat, tras, nahrávek a ceníku    |
| `fit-file-parser`    | 6.2.10 | MIT     | 2026-11-17 | Čtení souborů FIT v modulu 4             |

`packages/pii-cz` nemá žádné runtime závislosti. `packages/intake-rules` používá jen `zod` (schéma ceníku).
`packages/agent-runtime` používá `zod` a workspace balíčky `llm-core` a `pii-cz`.

`fit-file-parser` je v chunku stránky `#/local` (ne v úvodním bundlu). Tranzitivně přináší `buffer`
6.0.3 (MIT) s `base64-js` 1.5.1 (MIT) a `ieee754` 1.2.1 (BSD-3-Clause). Oficiální `@garmin/fitsdk`
se nepoužívá: má vlastní licenci Garmin („FIT Protocol License Agreement“), ne MIT/Apache/BSD.

### Volitelný NER v prohlížeči (lazy chunk, stahuje se až po kliknutí)

| Balíček                     | Verze                         | Licence    | Vydáno     | Účel                                                       |
| --------------------------- | ----------------------------- | ---------- | ---------- | ---------------------------------------------------------- |
| `@huggingface/transformers` | 4.3.2                         | Apache-2.0 | 2026-10-27 | Pipeline `token-classification` (transformers.js)          |
| `onnxruntime-web`           | 1.31.0-dev.20260914-8d85527a0 | MIT        | 2026-09-14 | Běhové prostředí ONNX (WASM), servírované z vlastního webu |

Tranzitivně se do prohlížeče dostávají `@huggingface/tokenizers` 0.2.0 (Apache-2.0),
`@huggingface/jinja` 0.5.13 (MIT), `onnxruntime-common` (MIT), `flatbuffers` (Apache-2.0),
`long` (Apache-2.0), `platform` (MIT), `protobufjs` (BSD-3-Clause) a `guid-typescript` 1.0.9
(**ISC**: permisivní licence ekvivalentní MIT; poslední vydání je staré, viz OQ-14).

`onnxruntime-web` je přímá závislost webu jen kvůli self-hostingu WASM souboru. Verze je stejná,
jakou vyžaduje `@huggingface/transformers` 4.3.2, a jde o **dev build** (viz OQ-13).

### Volitelný BYOK v prohlížeči a nahrávací skript (lazy chunk, stahuje se až po spuštění s vlastním klíčem)

| Balíček             | Verze  | Licence    | Vydáno     | Účel                                                                    |
| ------------------- | ------ | ---------- | ---------- | ----------------------------------------------------------------------- |
| `@anthropic-ai/sdk` | 1.12.0 | Apache-2.0 | 2026-11-20 | Oficiální SDK pro Messages API: BYOK na `#/agent` a `pnpm record:agent` |

SDK je závislost `packages/llm-core` a importuje se jen z podcesty `@trusted-ai-lab/llm-core/anthropic`.
Web ho proto načítá jako samostatný chunk (82,8 kB gzip) až po kliknutí na „Spustit s vlastním klíčem“
a do úvodního bundlu se nedostane. Verze 1.13.0 byla v den instalace mladší než 3 dny.
Starší vydání SDK (před přechodem na Apache-2.0) byla pod MIT.

Tranzitivně: `@opentelemetry/api` 1.10.0 (Apache-2.0), `json-schema-to-ts` 3.1.1 (MIT) s
`ts-algebra` 2.0.0 (MIT) a `@babel/runtime` 7.29.15 (MIT), `standardwebhooks` 1.3.0 (MIT) s
`@stablelib/base64` 1.0.1 (MIT) a `fast-sha256` 1.3.0 (**Unlicense**: permisivní, ekvivalent volného
díla, mimo seznam MIT/Apache/BSD). `standardwebhooks` a `fast-sha256` slouží k ověřování webhooků,
které BYOK ani nahrávání nepoužívají.

### Lokální jazykový model v prohlížeči (modul 4, stahuje se až po kliknutí)

| Balíček           | Verze  | Licence    | Vydáno     | Účel                                                |
| ----------------- | ------ | ---------- | ---------- | --------------------------------------------------- |
| `@mlc-ai/web-llm` | 0.2.89 | Apache-2.0 | 2026-11-17 | Běh jazykového modelu na grafické kartě přes WebGPU |

WebLLM se importuje jen ve Web Workeru (`apps/web/src/modules/local/coach/llm.worker.ts`). Stránka
ho sama neimportuje, takže se knihovna stáhne jednou (worker chunk 6,1 MB, 2,2 MB gzip) a až po
kliknutí na „Stáhnout a spustit“. Tranzitivně: `@mlc-ai/web-runtime` 0.28.0-dev2 (Apache-2.0,
vydáno 2026-11-09, **dev build**, viz OQ-31), `@mlc-ai/web-tokenizers` 0.1.6 (Apache-2.0),
`@mlc-ai/web-xgrammar` 0.1.27 (Apache-2.0), `loglevel` 1.9.2 (MIT). Jen typy (do bundlu nejdou):
`@types/chrome` 0.0.266 (MIT) a `@webgpu/types` 0.1.74 (BSD-3-Clause).

### Model, data a reference (nejsou npm balíčky)

| Co                                                                                                                                                                                                                                                  | Licence / podmínky                                                                                                                                                             | Použití                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| NER model [`onnx-community/small-e-czech-finetuned-ner-wikiann-ONNX`](https://huggingface.co/onnx-community/small-e-czech-finetuned-ner-wikiann-ONNX), revize `0c3c43a`                                                                             | ONNX repozitář licenci neuvádí; původní [`richielo/small-e-czech-finetuned-ner-wikiann`](https://huggingface.co/richielo/small-e-czech-finetuned-ner-wikiann) je **CC BY 4.0** | Volitelná detekce jmen. Stahuje se z Hugging Face, necommituje se. Atribuce je na stránce `#/pii`. |
| Základní model [`Seznam/small-e-czech`](https://huggingface.co/Seznam/small-e-czech)                                                                                                                                                                | CC BY 4.0 („allowing commercial use")                                                                                                                                          | Základ NER modelu                                                                                  |
| Dataset [WikiAnn](https://huggingface.co/datasets/unimelb-nlp/wikiann) (trénovací data NER)                                                                                                                                                         | na Hugging Face uvedeno „unknown" (viz OQ-12)                                                                                                                                  | Jen trénink modelu třetí stranou; v repu není                                                      |
| [MV ČR – Seznam jmen](https://mv.gov.cz/seznam-jmen), CSV `opendata-seznamjmenk2026-06-30` (11 782 jmen)                                                                                                                                            | U souboru licence neuvedena; [katalog otevřených dat MV](https://mv.gov.cz/opendata/catalogue) uvádí „bez licenčních omezení" (viz OQ-11)                                      | Slovník křestních jmen v `packages/pii-cz/src/data/first-names.json`                               |
| Modely [`mlc-ai/Qwen3-0.6B-q4f16_1-MLC`](https://huggingface.co/mlc-ai/Qwen3-0.6B-q4f16_1-MLC) a [`mlc-ai/Qwen3-1.7B-q4f16_1-MLC`](https://huggingface.co/mlc-ai/Qwen3-1.7B-q4f16_1-MLC) (+ varianty `q4f32_1`), revize připnuté v `coach/model.ts` | MLC repozitáře licenci neuvádějí; původní [Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B) a [Qwen3-1.7B](https://huggingface.co/Qwen/Qwen3-1.7B) jsou **Apache-2.0**      | Lokální trenér na `#/local`. Stahuje se z Hugging Face až po kliknutí, necommituje se              |
| Zkompilované knihovny WebGPU z [`mlc-ai/binary-mlc-llm-libs`](https://github.com/mlc-ai/binary-mlc-llm-libs), commit `5b7251f`, `v0_2_87/base`                                                                                                      | repozitář licenci neuvádí (projekt MLC LLM je Apache-2.0), viz OQ-30                                                                                                           | Stahuje se z `raw.githubusercontent.com` spolu s modelem                                           |
| [ČNB – Číselník kódů bank](https://www.cnb.cz/cs/platebni-styk/ucty-kody-bank/) č. 255, platný od 1. 10. 2026 (47 kódů)                                                                                                                             | veřejný číselník ČNB                                                                                                                                                           | `packages/pii-cz/src/data/bank-codes.json`                                                         |

### Zdroje modulu Intake (citované, nic se nestahuje za běhu)

| Co                                                                                                                                                                                                                                                                                                                 | Podmínky                                               | Použití                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------- |
| Ceník [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) a [OpenAI](https://developers.openai.com/api/docs/pricing), načteno 2026-11-24                                                                                                                                                         | veřejné ceníky; citují se jen čísla se zdrojem a datem | `data/pricing.json` (OQ-18)                                       |
| [AI Act Service Desk](https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act) (Evropská komise), [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2024/1689/oj), [Legislative Observatory EP](<https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0359(COD)>) | texty EU, odkazy                                       | `packages/intake-rules/src/ai-act.ts`, reference pravidel (OQ-17) |
| [OWASP Top 10 for LLM Applications 2026](https://genai.owasp.org/top-10-for-llm-applications-2026/)                                                                                                                                                                                                                | odkaz                                                  | reference pravidel                                                |
| [Google, Rules of Machine Learning](https://developers.google.com/machine-learning/guides/rules-of-ml)                                                                                                                                                                                                             | odkaz                                                  | reference pravidla `pattern.exact-solution`                       |

Referenční data stahuje `pnpm fetch:pii-reference-data` (ručně, ne v CI) a ukládá je se zdrojem a
datem stažení (2026-11-23).

## Vývoj a testy

| Balíček                            | Verze   | Licence    | Vydáno     | Účel                                       |
| ---------------------------------- | ------- | ---------- | ---------- | ------------------------------------------ |
| `typescript`                       | 6.0.3   | Apache-2.0 | 2026-04-16 | Typová kontrola (TS 7 viz OQ-01)           |
| `vite`                             | 8.3.8   | MIT        | 2026-11-11 | Build a dev server                         |
| `@vitejs/plugin-react`             | 6.3.0   | MIT        | 2026-11-09 | JSX a Fast Refresh                         |
| `vitest`                           | 5.1.1   | MIT        | 2026-11-18 | Unit testy                                 |
| `jsdom`                            | 31.0.1  | MIT        | 2026-11-13 | DOM pro unit testy komponent               |
| `@testing-library/react`           | 16.3.3  | MIT        | 2026-08-27 | Testy komponent                            |
| `@testing-library/dom`             | 10.4.2  | MIT        | 2026-09-13 | Peer závislost Testing Library             |
| `@playwright/test`                 | 1.65.1  | Apache-2.0 | 2026-11-13 | Smoke testy v prohlížeči                   |
| `eslint`                           | 10.15.0 | MIT        | 2026-11-13 | Lint                                       |
| `@eslint/js`                       | 10.0.1  | MIT        | 2026-02-06 | Základní pravidla ESLint                   |
| `typescript-eslint`                | 8.73.0  | MIT        | 2026-11-16 | Type-aware lint (8.74.0 mladší než 3 dny)  |
| `eslint-plugin-react-hooks`        | 7.1.1   | MIT        | 2026-04-17 | Pravidla hooků                             |
| `eslint-plugin-react-refresh`      | 0.5.8   | MIT        | 2026-11-15 | Kontrola exportů pro Fast Refresh          |
| `eslint-config-prettier`           | 10.1.8  | MIT        | 2025-07-18 | Vypnutí stylových pravidel kvůli Prettieru |
| `globals`                          | 17.14.0 | MIT        | 2026-11-01 | Definice globálních proměnných pro ESLint  |
| `prettier`                         | 3.10.1  | MIT        | 2026-11-12 | Formátování                                |
| `@types/react`, `@types/react-dom` | 19.3.0  | MIT        | 2026-09-09 | Typy                                       |
| `@types/node`                      | 26.6.6  | MIT        | 2026-10-28 | Typy pro Node 24                           |
| `fit-file-parser`                  | 6.2.10  | MIT        | 2026-11-17 | `FitEncoder` v generátoru ukázek (FIT)     |
| `@faker-js/faker`                  | 10.6.0  | MIT        | 2026-08-14 | Generátor syntetického korpusu PII (cs_CZ) |

### Lokální NER eval (Node, jen `pnpm eval:pii:ner`)

`@huggingface/transformers` je i dev závislost kořene. V Node táhne `onnxruntime-node` 1.30.0
(MIT, CPU binárky jsou v balíčku) a `sharp` 0.35.5 (Apache-2.0). Build skripty `onnxruntime-node`
(stahuje volitelné CUDA binárky) a `protobufjs` (vypisuje jen upozornění) jsou zakázané přes
`allowBuilds` v `pnpm-workspace.yaml`.

**Pozor:** `sharp` instaluje jako volitelnou závislost `@img/sharp-libvips-*` s licencí
**LGPL-3.0-or-later**. Ta není v povoleném seznamu. NER pracuje jen s textem, takže se `sharp`
nevolá. Do `dist` ani do balíčku `pii-cz` se nedostane, je jen na vývojovém stroji a v CI.
Rozhodnutí je zapsané jako OQ-15.

`eslint-config-prettier` má poslední vydání z 07/2025. Jde o malý, stabilní balíček (jen vypíná
pravidla) s podporou ESLint 10, takže pomalejší tempo vydávání nevadí.

## CI a prostředí

| Nástroj                                                | Verze  | Licence | Účel                                |
| ------------------------------------------------------ | ------ | ------- | ----------------------------------- |
| `actions/checkout`                                     | v7.0.1 | MIT     | Checkout (pinnuto na SHA)           |
| `actions/setup-node`                                   | v7.1.0 | MIT     | Node + cache pnpm store             |
| `pnpm/action-setup`                                    | v6.1.1 | MIT     | pnpm podle `packageManager`         |
| `actions/upload-artifact`                              | v7.0.2 | MIT     | Playwright report při selhání       |
| `actions/upload-pages-artifact`                        | v5.0.0 | MIT     | Artefakt pro Pages                  |
| `actions/deploy-pages`                                 | v5.0.1 | MIT     | Nasazení na GitHub Pages            |
| gitleaks (CLI binárka, ověřená SHA256)                 | 8.30.1 | MIT     | Sken tajných údajů v celé historii  |
| `mcr.microsoft.com/devcontainers/typescript-node:5-24` | 5-24   | MIT     | Image pro Codespaces / devcontainer |
