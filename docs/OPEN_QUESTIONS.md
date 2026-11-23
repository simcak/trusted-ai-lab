# Otevřené otázky a `TODO(verify)`

Vše, co čeká na ověření z oficiálního zdroje nebo na rozhodnutí. Každá položka má datum vzniku.

## K ověření (`TODO(verify)`)

Zatím žádné. Fáze 0 neobsahuje žádná čísla, ceny ani právní údaje.

## Technický dluh a sledované závislosti

| ID    | Vzniklo    | Otázka                                                                                                                    | Co udělat                                                                                           |
| ----- | ---------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| OQ-01 | 2026-11-23 | TypeScript 7.0 je vydaný, ale `typescript-eslint` 8.x podporuje jen `typescript <6.1.0`. Projekt proto zůstává na TS 6.0. | Až `typescript-eslint` ohlásí podporu TS 7 (`npm view typescript-eslint peerDependencies`), přejít. |
| OQ-02 | 2026-11-23 | Verzi gitleaks v `ci.yml` nehlídá Dependabot.                                                                             | Při údržbě ručně zvednout verzi a SHA256 podle `checksums.txt` z release.                           |

## Návrhové otázky na později

| ID    | Vzniklo    | Otázka                                                                                                                                                                           | Kdy      |
| ----- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| OQ-03 | 2026-11-23 | Moduly jsou lazy chunky, takže při výpadku sítě po načtení úvodní stránky by se modul nenačetl. Přednačíst chunky modulů po načtení (idle prefetch), nebo použít service worker? | fáze 5   |
| OQ-04 | 2026-11-23 | Content-Security-Policy: GitHub Pages neumí vlastní hlavičky, zbývá `<meta http-equiv>`. Bude potřeba povolit CDN modelů (HF, MLC), BYOK API a `wasm-unsafe-eval`.               | fáze 3–5 |
