# intake-rules

> **EN:** Deterministic rules engine behind the Intake module ("should this be AI at all?"). A use
> case is described by twelve closed-list facts; the engine recommends the simplest architecture
> pattern that fits (no AI, classic software, classic ML, single LLM call, RAG, agent, human in the
> loop), lists rejected alternatives with reasons, derives controls, an indicative EU AI Act
> category with its date of application, and a token cost range from a dated price list. Rules are
> data with a rationale and a reference; no language model is involved.

Pravidlový engine modulu [`#/intake`](../../apps/web/src/modules/intake/). Bez jazykového modelu:
stejný vstup dá vždy stejný výsledek a každé doporučení jde dohledat ke konkrétnímu pravidlu.

```ts
import { estimateCost, evaluate, PRESETS, PricingSchema } from '@trusted-ai-lab/intake-rules';

const facts = PRESETS['credit-decision'];
const result = evaluate(facts);
result.pattern; // 'classic-ml'
result.humanInTheLoop; // true
result.aiAct.category; // 'high-risk' (příloha III bod 5 písm. b), od 2. 12. 2027)
result.controls; // [{ control: 'fria', ruleIds: ['control.fria'] }, …]
result.fired; // id všech pravidel, která se uplatnila

estimateCost(result.pattern, facts.volume, facts.latency, PricingSchema.parse(pricingJson));
```

## Pravidlo

```ts
{
  id: 'aiact.high-risk-credit',
  stage: 'outcome',
  when: { all: [{ field: 'decisionAboutPeople', is: 'credit' }, { field: 'pattern', in: AI_PATTERNS }] },
  effect: { kind: 'ai-act', category: 'high-risk', appliesFrom: 'annex-iii' },
  rationale: 'Hodnocení úvěruschopnosti fyzických osob … je vysoce rizikové. …',
  reference: { label: 'AI Act, příloha III bod 5 písm. b)', url: 'https://ai-act-service-desk…' },
}
```

Podmínka `when` je data, ne funkce (`is`, `in`, `all`, `any`, `not`). Proto ji stránka umí ukázat
česky a ADR ji může citovat.

## Jak engine rozhoduje

1. **Zakázaná praktika** (AI Act čl. 5) ukončí výběr: výsledek je „nenasazovat“.
2. **Vyřazení vzorů.** Pravidla `pattern.*` vyřazují vzory, které se k úloze nehodí, a každé říká proč.
3. **Nejjednodušší zbývající vzor** vyhrává (`pattern.prefer-simplest`). Složitější vzory se zamítnou
   s odkazem na toto pravidlo. Když nezbude žádný, rozhoduje člověk (`pattern.no-candidate`).
4. **Důsledky.** Pravidla `hitl.*`, `aiact.*`, `data.*` a `control.*` vidí vstup i zvolený vzor a
   odvodí člověka ve smyčce, kategorii AI Act a kontroly.

## Testy

| Soubor               | Co hlídá                                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `rules.test.ts`      | Každé pravidlo má případ, kdy se uplatní (i s viditelným efektem), a kdy ne. Typ `Record<RuleId, …>` nedovolí přidat pravidlo bez testu. |
| `presets.test.ts`    | Osm předvoleb a jejich očekávaný vzor, HITL, kategorie AI Act, kontroly a druh nákladů.                                                  |
| `invariants.test.ts` | Všech 151 200 kombinací vstupů: zákaz ⇔ blokace, vysoké riziko ⇒ HITL, osobní data do LLM ⇒ pseudonymizace…                              |
| `integrity.test.ts`  | Unikátní id, zdůvodnění a reference u každého pravidla, žádný „mrtvý“ vzor ani kontrola.                                                 |
| `cost.test.ts`       | Aritmetika odhadu na smyšleném ceníku, placeholdery, Batch.                                                                              |
| `pricing.test.ts`    | Skutečný `data/pricing.json`: zdroj, datum, ceny pro každou velikost modelu.                                                             |

## Zdroje a omezení

- **AI Act** ve znění nařízení (EU) 2026/1744 (Digital Omnibus), stav k 2026-11-24, viz
  `src/ai-act.ts`. Články odkazují na konsolidované znění v AI Act Service Desk Evropské komise.
  Text v Úředním věstníku se nepodařilo strojově načíst (OQ-17). Klasifikace je orientační.
- **GDPR:** čísla článků jsou citována bez strojového ověření (OQ-21).
- **OWASP Top 10 for LLM Applications**, vydání 2026.
- **Ceny** jsou v [`data/pricing.json`](../../data/pricing.json) se zdrojem a datem (OQ-18).
  Tokeny na dotaz jsou předpoklad dema, ne měření (OQ-19).
- Pravidla pokrývají jen to, co se dá zjistit z dvanácti otázek. Skutečné posouzení (DPIA, FRIA,
  právní výklad) nenahrazují.
