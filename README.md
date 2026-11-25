# Bezpečná AI v praxi — trusted-ai-lab

> **EN:** A static, zero-cost portfolio demo of AI architecture decisions for regulated environments:
> whether to use AI at all (rule-based intake), how to keep personal data out of the model (Czech PII
> detection), how to keep an acting agent under control (separate policy layer, audited traces), and
> what to do when data must never leave the device (local in-browser model). Runs entirely in the
> browser — no backend, no API key; model outputs are pre-recorded and replayed.

Čtyři interaktivní ukázky toho, jak architekt rozhoduje, jestli a jak nasadit AI tam, kde jde o citlivá data.

**Stav:** rozpracováno. Hotové jsou všechny čtyři moduly: Intake, Ochrana dat, Agent pod kontrolou a Lokálně (lokální jazykový model v prohlížeči). Plný README přijde ve fázi 5.

- Živé demo: <https://simcak.github.io/trusted-ai-lab/> (dostupné po prvním nasazení)
- [![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/simcak/trusted-ai-lab)

## Jak spustit lokálně

Potřebuješ Node 24 (viz `.nvmrc`) a pnpm 12 (`npm install -g pnpm@12`).

```sh
pnpm install
pnpm dev          # http://localhost:5173/trusted-ai-lab/
```

| Příkaz            | Co dělá                                                      |
| ----------------- | ------------------------------------------------------------ |
| `pnpm lint`       | ESLint + kontrola formátování (Prettier)                     |
| `pnpm typecheck`  | TypeScript ve všech balíčcích                                |
| `pnpm test`       | Unit testy (Vitest)                                          |
| `pnpm build`      | Produkční build do `apps/web/dist`                           |
| `pnpm check:size` | Hlídá rozpočet úvodního JS (< 300 kB gzip)                   |
| `pnpm test:e2e`   | Smoke testy v Chromiu (Playwright; sestaví a spustí preview) |

Před prvním `pnpm test:e2e` nainstaluj prohlížeč: `pnpm --filter @trusted-ai-lab/web exec playwright install --no-shell chromium`.

## Struktura

```
apps/web/              frontend: landing, 4 moduly (lazy chunky), sdílený TracePanel
packages/llm-core/     rozhraní LlmProvider, ReplayProvider, trace typy (zod)
packages/pii-cz/       detekce a pseudonymizace českých osobních údajů
packages/intake-rules/ pravidlový engine modulu Intake (bez LLM)
packages/agent-runtime/ fáze 3
data/, evals/, docs/   syntetická data, evaly, dokumentace
```

## Upozornění

Technické demo. Nejde o investiční, právní ani zdravotní doporučení. Bez vazby na zmíněné společnosti.
Všechna data jsou syntetická, fondy fiktivní. Klasifikace podle AI Act je pouze orientační.

## Licence

[MIT](LICENSE). Závislosti třetích stran viz [THIRD_PARTY.md](THIRD_PARTY.md).
