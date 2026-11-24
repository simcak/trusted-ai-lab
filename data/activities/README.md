# data/activities

Tři **syntetické** sportovní aktivity pro modul 4 (`#/local`). Smyšlený sportovec, smyšlené
zařízení („Ukázkové hodinky S1“) a procedurální trasy, které nesledují ulice. Nejde o záznam
skutečné osoby.

| Soubor                 | Formát | Sport          | Co ukazuje                                                       |
| ---------------------- | ------ | -------------- | ---------------------------------------------------------------- |
| `vecerni-beh.gpx`      | GPX    | běh ~6 km      | tep v rozšíření TrackPointExtension, 42 s zastávka na křižovatce |
| `vyjizdka-na-kole.tcx` | TCX    | kolo ~25 km    | kopce, kadence, metadata cyklopočítače a aplikace                |
| `intervaly.fit`        | FIT    | běh, intervaly | rozklus, 6 × 2 min v zónách 4–5, výklus; binární formát hodinek  |

Všechny tři začínají i končí na stejném smyšleném „domově“ (park v Brně), takže privacy zone má
co skrýt. Data jsou ze dnů 16., 18. a 21. 11. 2026, takže dohromady tvoří jeden tréninkový týden.

```sh
pnpm generate:activities                 # zapíše soubory a manifest.json
node data/activities/generate.ts --check # CI: selže, když se soubory liší
```

Generátor (`activities.ts`) je deterministický: vlastní PRNG se semínkem, pevná data. Tep
sleduje cílovou intenzitu se zpožděním, poloha a výška mají malý Gaussův šum. FIT zapisuje
`FitEncoder` z `fit-file-parser`, převody jednotek (semicircles, měřítko a posun výšky) dělá
generátor sám. `manifest.json` nese parametry, ze kterých soubory vznikly (počet bodů, délka trasy
bez šumu, max. a klidový tep sportovce). Testy webu podle něj ověřují parsery.
