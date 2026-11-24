/**
 * Preset texts for the playground. Synthetic data only: names are invented combinations, numbers
 * are random and valid only by their checksums (generated with data/pii/values.ts), e-mails use
 * the reserved example.com domain. Labels live in i18n/cs.ts.
 */
export const SAMPLE_IDS = ['client-email', 'advisor-note', 'contract', 'hard-cases'] as const;
export type SampleId = (typeof SAMPLE_IDS)[number];

export const SAMPLES: Readonly<Record<SampleId, string>> = {
  'client-email': `Dobrý den,

jmenuji se Jan Dvořák a chtěl bych změnit účet pro výplatu výnosů z fondu Alfa na 86-6872635/0100. Moje rodné číslo je 791112/5013, bydlím na adrese Lipová 1234/5, 602 00 Brno.

Pokud bude potřeba, volejte na +420 604 043 590 nebo pište na jan.dvorak@example.com.

S pozdravem
Jan Dvořák`,

  'advisor-note': `Schůzka s klientkou Petrou Novotnou dne 12. 3. 2026. Zájem o fond Beta, investice 250 000 Kč. RČ 8852216340, výnosy na IBAN CZ28 3030 0000 0000 0601 1843.
Předat návrh panu Novotnému (manžel), tel. 720 015 751. Schůzka na pobočce Praha 5.`,

  contract: `Smluvní strany:
1. Ing. Josef Svoboda, r. č. 491017/022, bytem Na Výsluní 7, 251 01 Říčany, číslo OP 205123456 (dále jen „klient“)
2. Investiční společnost Alfa, a.s., IČO 84813636, DIČ CZ84813636, se sídlem Dlouhá 12, 110 00 Praha 1

Výnosy budou poukazovány na účet 6011843/3030 vedený na jméno klienta.`,

  'hard-cases': `Číslo smlouvy 8501011234 není rodné číslo, nesedí kontrolní součet. Celková investice 736 028 541 Kč není telefon.
Nový fond Gama je Král mezi fondy, ale pan Král a Petr Nový jsou lidé. Pobočka Praha 5 není adresa.
Dceři Lucii, r. č. 067704/4357, založíme spoření. Telefon 608 10 96 96, e-mail lucie.kralova (at) example.com.
ahoj, tady jana nováková, píšu malými písmeny a bez kontextu.`,
};
