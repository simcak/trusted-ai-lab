# Závislosti třetích stran

Před přidáním závislosti se ověřuje licence (povolené MIT / Apache-2.0 / BSD) a aktivní údržba.
Licence ověřena z metadat npm registru; „Vydáno" = datum vydání použité verze. Stav k 2026-11-23.

Instalace navíc hlídá `minimumReleaseAge` (3 dny) v `pnpm-workspace.yaml`. Verze mladší než 3 dny
se neinstalují, protože kompromitované releasy bývají odhaleny a staženy obvykle během pár dní.

## Runtime (jde do prohlížeče)

| Balíček              | Verze  | Licence | Vydáno     | Účel                                     |
| -------------------- | ------ | ------- | ---------- | ---------------------------------------- |
| `react`, `react-dom` | 19.3.1 | MIT     | 2026-10-14 | UI                                       |
| `react-router`       | 8.5.2  | MIT     | 2026-11-18 | `HashRouter` (GitHub Pages nemá rewrite) |
| `zod`                | 4.6.7  | MIT     | 2026-10-12 | Validace dat, tras a nahrávek            |

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
| `@types/node`                      | 24.19.2 | MIT        | 2026-10-09 | Typy pro Node 24                           |

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
