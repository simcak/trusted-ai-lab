/**
 * Corpus templates: short synthetic texts of three genres (client e-mail, advisor note, contract
 * excerpt) plus deliberately hard cases. Every PII value is inserted as an entity part, so gold
 * spans are exact by construction. Gold conventions: data/pii/README.md.
 */
import type { Faker } from '@faker-js/faker';
import type { PiiType } from '@trusted-ai-lab/pii-cz';
import { decline, declineFirst, declineSurname, type Case, type Person } from './names.ts';
import {
  account,
  amount,
  digits,
  formatAccount,
  formatPhone,
  houseNumber,
  iban,
  ico,
  phoneDigits,
  psc,
  rodneCislo,
  rodneCisloBadChecksum,
  skIban,
  withSlash,
  type PhoneFormat,
  type Sex,
} from './values.ts';

export interface Entity {
  type: PiiType;
  text: string;
}
export type Part = string | Entity;

export type Genre = 'client_email' | 'advisor_note' | 'contract' | 'hard_case';

export interface Template {
  id: string;
  genre: Genre;
  /** Hard-case tags for error analysis. */
  tags: readonly string[];
  /** Returns the parts, or `undefined` if the random values do not fit (e.g. undeclinable name). */
  build: (g: Gen) => Part[] | undefined;
}

const ent = (type: PiiType, text: string): Entity => ({ type, text });

/** Helpers bound to one seeded faker instance. */
export class Gen {
  readonly f: Faker;

  constructor(f: Faker) {
    this.f = f;
  }

  pick<T>(items: readonly T[]): T {
    return this.f.helpers.arrayElement(items);
  }

  chance(p: number): boolean {
    return this.f.datatype.boolean(p);
  }

  sex(): Sex {
    return this.chance(0.5) ? 'M' : 'F';
  }

  person(sex: Sex = this.sex()): Person {
    const g = sex === 'M' ? 'male' : 'female';
    return { first: this.f.person.firstName(g), last: this.f.person.lastName(g), sex };
  }

  /** Person name as an entity in the given case, or undefined when it cannot be declined. */
  name(p: Person, c: Case = 'nom'): Entity | undefined {
    const d = decline(p, c);
    return d ? ent('PERSON', `${d.first} ${d.last}`) : undefined;
  }

  surname(p: Person, c: Case = 'nom'): Entity | undefined {
    const s = declineSurname(p, c);
    return s ? ent('PERSON', s) : undefined;
  }

  firstName(p: Person, c: Case = 'nom'): Entity | undefined {
    const s = declineFirst(p, c);
    return s ? ent('PERSON', s) : undefined;
  }

  /** Gender agreement: „Chtěl" / „Chtěla". */
  verb(p: Person, masculine: string, feminine: string): string {
    return p.sex === 'M' ? masculine : feminine;
  }

  birthYear(): number {
    return this.f.number.int({ min: 1955, max: 2004 });
  }

  rc(p: Person, opts: { slash?: boolean; year?: number } = {}): Entity {
    const value = rodneCislo(this.f, { sex: p.sex, year: opts.year ?? this.birthYear() });
    return ent('RODNE_CISLO', (opts.slash ?? this.chance(0.7)) ? withSlash(value) : value);
  }

  rcNineDigit(p: Person): Entity {
    const value = rodneCislo(this.f, {
      sex: p.sex,
      year: this.f.number.int({ min: 1925, max: 1953 }),
    });
    return ent('RODNE_CISLO', withSlash(value));
  }

  rcSupplementary(p: Person): Entity {
    const value = rodneCislo(this.f, {
      sex: p.sex,
      year: this.f.number.int({ min: 2004, max: 2012 }),
      supplementary: true,
    });
    return ent('RODNE_CISLO', withSlash(value));
  }

  rcRemainder10(p: Person): Entity {
    const value = rodneCislo(this.f, {
      sex: p.sex,
      year: this.f.number.int({ min: 1955, max: 1985 }),
      remainder10: true,
    });
    return ent('RODNE_CISLO', withSlash(value));
  }

  rcBadChecksum(): string {
    return rodneCisloBadChecksum(this.f, this.sex(), this.birthYear());
  }

  phone(
    formats: readonly PhoneFormat[] = ['intl', 'grouped', 'intl', 'double_zero', 'intl_compact'],
  ): Entity {
    return ent('PHONE', formatPhone(phoneDigits(this.f), this.pick(formats)));
  }

  email(p: Person): Entity {
    return ent('EMAIL', this.f.internet.email({ firstName: p.first, lastName: p.last }));
  }

  emailObfuscated(p: Person): Entity {
    const plain = this.f.internet
      .email({ firstName: p.first, lastName: p.last, allowSpecialCharacters: false })
      .toLowerCase();
    const [local, domain] = plain.split('@') as [string, string];
    return ent('EMAIL', `${local} ${this.pick(['(at)', '[at]', '(zavináč)'])} ${domain}`);
  }

  account(): Entity {
    return ent('BANK_ACCOUNT', formatAccount(account(this.f, this.chance(0.35))));
  }

  iban(): Entity {
    return ent('IBAN', iban(account(this.f, this.chance(0.35)), this.chance(0.6)));
  }

  ico(): Entity {
    return ent('ICO', ico(this.f));
  }

  dicFromIco(): Entity {
    return ent('DIC', `CZ${ico(this.f)}`);
  }

  dicFromRc(p: Person): Entity {
    return ent('DIC', `CZ${rodneCislo(this.f, { sex: p.sex, year: this.birthYear() })}`);
  }

  psc(): Entity {
    return ent('PSC', psc(this.f));
  }

  city(): string {
    return this.chance(0.15)
      ? `Praha ${this.f.number.int({ min: 1, max: 10 })}`
      : this.f.location.city();
  }

  address(style: 'full' | 'no_postal' = this.chance(0.85) ? 'full' : 'no_postal'): Entity {
    const street = `${this.f.location.street()} ${houseNumber(this.f)}`;
    const city = this.city();
    const value = style === 'full' ? `${street}, ${psc(this.f)} ${city}` : `${street}, ${city}`;
    return ent('ADDRESS', value);
  }

  /** Street-less address of a village house: „Lhota č. p. 45, 538 21 Slatiňany". */
  addressHouseNumberOnly(): Entity {
    const village = this.f.location.city();
    const cp = this.f.number.int({ min: 1, max: 400 });
    return ent('ADDRESS', `${village} č. p. ${cp}, ${psc(this.f)} ${this.f.location.city()}`);
  }

  idCard(): Entity {
    return ent('ID_CARD', digits(this.f, 9));
  }

  passport(): Entity {
    return ent('PASSPORT', digits(this.f, 8));
  }

  money(min = 10_000, max = 3_000_000): string {
    const step = 1000;
    return amount(Math.round(this.f.number.int({ min, max }) / step) * step);
  }

  date(): string {
    return `${this.f.number.int({ min: 1, max: 28 })}. ${this.f.number.int({ min: 1, max: 12 })}. 2026`;
  }

  fund(): string {
    return this.pick(['Alfa', 'Beta', 'Gama', 'Delta', 'Omega']);
  }
}

/** Strips diacritics, as in hastily typed e-mails („Jiri Horejsi"). */
const ascii = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');

const title = (g: Gen) => g.pick(['Ing.', 'Mgr.', 'MUDr.', 'JUDr.', 'Bc.', 'doc. Ing.']);

/** Surnames that are also ordinary words (hard case: „Nový fond" vs. „Petr Nový"). */
const WORD_SURNAMES: readonly Person[] = [
  { first: 'Petr', last: 'Nový', sex: 'M' },
  { first: 'Jan', last: 'Král', sex: 'M' },
  { first: 'Pavel', last: 'Černý', sex: 'M' },
  { first: 'Tomáš', last: 'Malý', sex: 'M' },
  { first: 'Eva', last: 'Nová', sex: 'F' },
  { first: 'Jana', last: 'Králová', sex: 'F' },
  { first: 'Martin', last: 'Veselý', sex: 'M' },
  { first: 'Lucie', last: 'Bílá', sex: 'F' },
];

/** Invented surnames unlikely to be in any list (tests the heuristics, not a dictionary). */
function rareSurname(g: Gen, sex: Sex): string {
  const stem =
    g.pick(['Kud', 'Bř', 'Pešť', 'Vrb', 'Hnil', 'Štěp', 'Zrz', 'Mlč', 'Kvas', 'Dub']) +
    g.pick(['ec', 'ák', 'ín', 'oň', 'ich', 'ál']);
  return sex === 'M' ? stem : `${stem}ová`;
}

export const TEMPLATES: readonly Template[] = [
  // ── Client e-mails ─────────────────────────────────────────────────────────────────────────
  {
    id: 'email-change-account',
    genre: 'client_email',
    tags: [],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        'Dobrý den,\n\njmenuji se ',
        name,
        `. ${g.verb(p, 'Chtěl', 'Chtěla')} bych změnit účet pro výplatu výnosů na `,
        g.account(),
        '. Moje rodné číslo je ',
        g.rc(p),
        '.\n\nS pozdravem\n',
        name,
        '\ntel. ',
        g.phone(),
      ];
    },
  },
  {
    id: 'email-new-address',
    genre: 'client_email',
    tags: [],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        `Dobrý den, ${g.verb(p, 'přestěhoval', 'přestěhovala')} jsem se. Nová adresa: `,
        g.address('full'),
        '. Telefon zůstává ',
        g.phone(),
        '. Děkuji, ',
        name,
      ];
    },
  },
  {
    id: 'email-statement',
    genre: 'client_email',
    tags: ['iban'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        'Prosím o zaslání ročního výpisu na e-mail ',
        g.email(p),
        '. Platby posílám z účtu IBAN ',
        g.iban(),
        `. Fond ${g.fund()} mám od roku ${g.f.number.int({ min: 2015, max: 2025 })}.\n`,
        name,
      ];
    },
  },
  {
    id: 'email-invest',
    genre: 'client_email',
    tags: ['vocative', 'formal-pronoun'],
    build: (g) => {
      const advisor = g.person();
      const client = g.person();
      const voc = g.surname(advisor, 'voc');
      const name = g.name(client);
      if (!voc || !name) return undefined;
      return [
        `${advisor.sex === 'M' ? 'Vážený pane' : 'Vážená paní'} `,
        voc,
        `,\nděkuji za informace o fondu ${g.fund()}. Jak Vám mám poslat podepsanou smlouvu? Investovat chci ${g.money()} Kč. Můj e-mail je `,
        g.email(client),
        ', mobil ',
        g.phone(['grouped', 'intl']),
        '.\n',
        name,
      ];
    },
  },
  {
    id: 'email-id-card',
    genre: 'client_email',
    tags: ['id-card'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        'Dobrý den, v příloze posílám kopii dokladu, číslo OP ',
        g.idCard(),
        '. Trvalé bydliště ',
        g.address('full'),
        '. S pozdravem ',
        name,
      ];
    },
  },
  {
    id: 'email-osvc',
    genre: 'client_email',
    tags: ['ico', 'dic'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        'Dobrý den, jsem OSVČ a potřebuji potvrzení pro účetní. Moje IČO: ',
        g.ico(),
        ', DIČ: ',
        g.dicFromRc(p),
        '. Děkuji Vám.\n',
        name,
      ];
    },
  },
  {
    id: 'email-greeting-first-name',
    genre: 'client_email',
    tags: ['first-name-only', 'vocative'],
    build: (g) => {
      const colleague = g.person();
      const client = g.person();
      const voc = g.firstName(colleague, 'voc');
      const dat = g.name(client, 'dat');
      if (!voc || !dat) return undefined;
      return [
        'Ahoj ',
        voc,
        ', můžeš prosím zavolat ',
        dat,
        '? Číslo je ',
        g.phone(['grouped']),
        '. Díky!',
      ];
    },
  },
  {
    id: 'email-obfuscated',
    genre: 'client_email',
    tags: ['obfuscated-email'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return ['Dobrý den, pište mi prosím na ', g.emailObfuscated(p), ', telefon nezvedám. ', name];
    },
  },

  // ── Advisor notes ──────────────────────────────────────────────────────────────────────────
  {
    id: 'note-meeting',
    genre: 'advisor_note',
    tags: ['inflected-name', 'rc-no-slash'],
    build: (g) => {
      const p = g.person();
      const ins = g.name(p, 'ins');
      if (!ins) return undefined;
      return [
        `Schůzka s ${p.sex === 'M' ? 'klientem' : 'klientkou'} `,
        ins,
        ` dne ${g.date()}. Zájem o fond ${g.fund()}, horizont ${g.f.number.int({ min: 3, max: 15 })} let. RČ `,
        g.rc(p, { slash: false }),
        '. Volat na ',
        g.phone(),
        '.',
      ];
    },
  },
  {
    id: 'note-change-bank',
    genre: 'advisor_note',
    tags: [],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        p.sex === 'M' ? 'Klient ' : 'Klientka ',
        name,
        ' (nar. ',
        g.rc(p, { slash: true }),
        ') žádá o změnu bankovního spojení na ',
        g.account(),
        '.',
      ];
    },
  },
  {
    id: 'note-call-amount',
    genre: 'advisor_note',
    tags: ['inflected-name', 'amount-like-phone'],
    build: (g) => {
      const p = g.person();
      const dat = g.name(p, 'dat');
      if (!dat) return undefined;
      const big = amount(g.f.number.int({ min: 100_000_000, max: 999_999_999 }));
      return [
        'Zavolat ',
        dat,
        ' po 15. hodině na ',
        g.phone(['grouped', 'intl']),
        `. Celková investice rodiny ${big} Kč, z toho ${g.money()} Kč do fondu ${g.fund()}.`,
      ];
    },
  },
  {
    id: 'note-handover',
    genre: 'advisor_note',
    tags: ['inflected-name', 'obfuscated-email'],
    build: (g) => {
      const p = g.person();
      const dat = g.name(p, 'dat');
      if (!dat) return undefined;
      return ['Předat ', dat, ' návrh smlouvy. Kontakt přes e-mail ', g.emailObfuscated(p), '.'];
    },
  },
  {
    id: 'note-surname-only',
    genre: 'advisor_note',
    tags: ['surname-only', 'common-word'],
    build: (g) => {
      const p = g.person();
      const surname = g.surname(p);
      if (!surname) return undefined;
      return [
        p.sex === 'M' ? 'Pan ' : 'Paní ',
        surname,
        ` se ptal${p.sex === 'M' ? '' : 'a'} na poplatky. Nový fond ${g.fund()} má nižší vstupní poplatek, doporučit srovnání.`,
      ];
    },
  },
  {
    id: 'note-passport',
    genre: 'advisor_note',
    tags: ['passport', 'title'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        `${p.sex === 'M' ? 'Klient' : 'Klientka'} ${title(g)} `,
        name,
        ' předložil' + (p.sex === 'M' ? '' : 'a') + ' cestovní pas č. ',
        g.passport(),
        '. Totožnost ověřena na pobočce.',
      ];
    },
  },
  {
    id: 'note-standing-order',
    genre: 'advisor_note',
    tags: ['feminine-surname'],
    build: (g) => {
      const p = g.person('F');
      return [
        'Dnes volala ',
        ent('PERSON', p.last),
        ', chce zrušit trvalý příkaz z účtu ',
        g.account(),
        `. Poslední platba ${g.money(500, 20_000)} Kč.`,
      ];
    },
  },
  {
    id: 'note-branch',
    genre: 'advisor_note',
    tags: ['city-district'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        name,
        ` – schůzka na pobočce ${g.pick(['Praha 5', 'Praha 4', 'Brno 2', 'Praha 10'])} přesunuta na ${g.date()}. Kontakt: `,
        g.phone(),
        '.',
      ];
    },
  },

  // ── Contract excerpts ──────────────────────────────────────────────────────────────────────
  {
    id: 'contract-parties',
    genre: 'contract',
    tags: ['ico-company'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        'Smluvní strany:\n1. ',
        name,
        ', r. č. ',
        g.rc(p, { slash: true }),
        ', bytem ',
        g.address('full'),
        ' (dále jen „klient“)\n2. Investiční společnost Alfa, a.s., IČO ',
        g.ico(),
        ', se sídlem ',
        g.address('full'),
      ];
    },
  },
  {
    id: 'contract-form',
    genre: 'contract',
    tags: [],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        'Klient: ',
        name,
        '\nRodné číslo: ',
        g.rc(p),
        '\nTrvalé bydliště: ',
        g.address(),
        '\nČíslo OP: ',
        g.idCard(),
        '\nBankovní spojení: ',
        g.account(),
      ];
    },
  },
  {
    id: 'contract-proxy',
    genre: 'contract',
    tags: ['rc-nine-digit', 'title'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        `Zmocněnec: ${title(g)} `,
        name,
        ', nar. ',
        g.rcNineDigit(p),
        ', bytem ',
        g.address('full'),
        '. Zmocnění platí do odvolání.',
      ];
    },
  },
  {
    id: 'contract-payments',
    genre: 'contract',
    tags: ['iban'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        'Výnosy budou poukazovány na účet ',
        g.iban(),
        ' vedený na jméno ',
        name,
        `. Minimální výše jednorázové investice je ${g.money(1000, 50_000)} Kč.`,
      ];
    },
  },
  {
    id: 'contract-entrepreneur',
    genre: 'contract',
    tags: ['ico', 'dic'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        'Podnikatel ',
        name,
        ', IČO ',
        g.ico(),
        ', DIČ ',
        g.dicFromIco(),
        ', místo podnikání ',
        g.address('full'),
        '.',
      ];
    },
  },
  {
    id: 'contract-contact',
    genre: 'contract',
    tags: ['postal-code'],
    build: (g) => {
      const p = g.person();
      return [
        'Kontaktní údaje: e-mail ',
        g.email(p),
        ', telefon ',
        g.phone(),
        ', doručovací adresa ',
        g.address('full'),
        ' (PSČ pro zásilky: ',
        g.psc(),
        ').',
      ];
    },
  },

  // ── Hard cases ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'hard-bad-checksum',
    genre: 'hard_case',
    tags: ['rc-bad-checksum'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        `Číslo smlouvy ${g.rcBadChecksum()} je uvedeno v příloze. Kontaktní osoba `,
        name,
        '.',
      ];
    },
  },
  {
    id: 'hard-fund-district',
    genre: 'hard_case',
    tags: ['city-district', 'fund-name'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        `Fond ${g.fund()} ${g.f.number.int({ min: 2, max: 9 })} dosáhl výnosu ${g.f.number.int({ min: 1, max: 9 })},${g.f.number.int({ min: 0, max: 9 })} %. Pobočka ${g.pick(['Praha 5', 'Praha 2', 'Brno 1'])}, vyřizuje `,
        name,
        '.',
      ];
    },
  },
  {
    id: 'hard-word-surname',
    genre: 'hard_case',
    tags: ['common-word'],
    build: (g) => {
      const p = g.pick(WORD_SURNAMES);
      return [
        ent('PERSON', `${p.first} ${p.last}`),
        ` ${g.verb(p, 'potvrdil', 'potvrdila')} podpis. ${g.pick(['Nový', 'Malý', 'Veselý'])} klient dostane bonus a fond ${g.fund()} zůstává Král mezi fondy.`,
      ];
    },
  },
  {
    id: 'hard-order-number',
    genre: 'hard_case',
    tags: ['nine-digit-no-context'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p, 'dat');
      if (!name) return undefined;
      return [
        `Objednávka ${phoneDigits(g.f)} byla vyřízena, variabilní symbol ${digits(g.f, 10)}. Potvrzení odesláno `,
        name,
        '.',
      ];
    },
  },
  {
    id: 'hard-rare-surname',
    genre: 'hard_case',
    tags: ['rare-surname'],
    build: (g) => {
      const sex = g.sex();
      const p = { ...g.person(sex), last: rareSurname(g, sex) };
      return [
        `${p.sex === 'M' ? 'Klient' : 'Klientka'} `,
        ent('PERSON', `${p.first} ${p.last}`),
        ' doložil' + (p.sex === 'M' ? '' : 'a') + ' výpis z účtu ',
        g.account(),
        '.',
      ];
    },
  },
  {
    id: 'hard-supplementary-rc',
    genre: 'hard_case',
    tags: ['rc-supplementary'],
    build: (g) => {
      const parent = g.person();
      const child = g.person();
      const parentName = g.name(parent);
      const childName = g.name(child);
      if (!parentName || !childName) return undefined;
      return [
        'Zákonný zástupce ',
        parentName,
        ' zakládá spoření pro nezletilé dítě ',
        childName,
        ', r. č. ',
        g.rcSupplementary(child),
        '.',
      ];
    },
  },
  {
    id: 'hard-remainder-10',
    genre: 'hard_case',
    tags: ['rc-remainder-10'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return ['Ověřeno: ', name, ', rodné číslo ', g.rcRemainder10(p), '.'];
    },
  },
  {
    id: 'hard-address-no-postal',
    genre: 'hard_case',
    tags: ['address-no-postal'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [name, ' bydlí na adrese ', g.address('no_postal'), ', zásilky přebírá osobně.'];
    },
  },
  {
    id: 'hard-two-first-names',
    genre: 'hard_case',
    tags: ['sentence-start-name'],
    build: (g) => {
      const p = g.person();
      const q = g.person();
      const name = g.name(p);
      const other = g.name(q);
      if (!name || !other) return undefined;
      return [
        name,
        ' a ',
        other,
        ` podepsali společnou smlouvu. ${g.pick(['Pak', 'Ale', 'Jak'])} bylo domluveno, výpisy půjdou na `,
        g.email(p),
        '.',
      ];
    },
  },
  {
    id: 'hard-lowercase-name',
    genre: 'hard_case',
    tags: ['lowercase-name'],
    build: (g) => {
      const p = g.person();
      return [
        'ahoj, tady ',
        ent('PERSON', `${p.first} ${p.last}`.toLocaleLowerCase('cs')),
        ', volám kvůli výpisu. zavolej mi na ',
        g.phone(['grouped', 'compact']),
        ' díky',
      ];
    },
  },
  {
    id: 'hard-no-diacritics',
    genre: 'hard_case',
    tags: ['no-diacritics'],
    build: (g) => {
      const p = g.person();
      return [
        'Dobry den, jsem ',
        ent('PERSON', ascii(`${p.first} ${p.last}`)),
        ' a potrebuji zmenit ucet na ',
        g.account(),
        '. Dekuji',
      ];
    },
  },
  {
    id: 'hard-phone-pairs',
    genre: 'hard_case',
    tags: ['phone-pairs'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [name, ', telefon ', g.phone(['pairs']), ', volat dopoledne.'];
    },
  },
  {
    id: 'hard-address-cp',
    genre: 'hard_case',
    tags: ['address-cp'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [name, ', trvale bytem ', g.addressHouseNumberOnly(), '.'];
    },
  },
  {
    id: 'hard-sk-iban',
    genre: 'hard_case',
    tags: ['iban-foreign'],
    build: (g) => {
      const p = g.person();
      const name = g.name(p);
      if (!name) return undefined;
      return [
        'Platba přijde ze slovenského účtu ',
        ent('IBAN', skIban(g.f)),
        ', majitel účtu ',
        name,
        '.',
      ];
    },
  },
];
