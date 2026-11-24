# agent-runtime

> **EN:** Own agent loop (no framework, at most 6 model calls) for the "Agent under control"
> module. A policy engine is a separate layer with fixed hooks: tool allowlist per persona, argument
> validation, step and token budgets, loop detection, `pii-cz` pseudonymisation of everything sent to
> the model, untrusted tool output with prompt-injection quarantine, a content policy against
> investment advice, and human approval for actions. Every decision is a trace event with a rule id
> and a reason. With guardrails off the same loop runs with the same prompt and no policy layer.

Runtime modulu [`#/agent`](../../apps/web/src/modules/agent/). Nad fiktivními fondy z
[`data/funds.json`](../../data/funds.json).

```ts
import { createTraceLog } from '@trusted-ai-lab/llm-core';
import { runAgent, runKey, SCENARIOS } from '@trusted-ai-lab/agent-runtime';

const s = SCENARIOS['s4-rodne-cislo'];
const result = await runAgent({
  provider, // libovolný LlmProvider: replay, BYOK…
  log: createTraceLog(), // každé volání modelu a nástroje a každé rozhodnutí pravidel
  funds,
  persona: s.persona,
  guardrails: true,
  userMessage: s.userMessage,
  approve, // člověk ve smyčce: schválí nebo zamítne koncept e-mailu
  scenario: runKey(s.id, true),
});
result.status; // 'completed' | 'refused_by_policy' | 'stopped_by_policy' | 'step_limit' | …
result.answer; // odpověď pro uživatele (re-identifikovaná lokálně)
result.drafts; // koncepty e-mailů: nikdy se neodesílají
```

## Smyčka

Model → nástroje → model, nejvýš `HARD_MAX_MODEL_CALLS` (6) volání. Ten strop patří runtime, ne
guardrails, takže platí i s vypnutými pravidly. Historie pro model je jen přidávaná a uložená
v pseudonymizované podobě. Systémový prompt a seznam nástrojů se během běhu nemění, jak to vyžaduje
kontrola historie u thinking bloků. Testy to ověřují.

## Pravidla (`policy/engine.ts`)

| Pravidlo           | Kde                   | Co dělá                                                                                                            |
| ------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `tool-allowlist`   | začátek běhu + brána  | klient má `search_funds` a `calculate_fees`, poradce navíc `draft_email`; nepovolený nástroj se skryje i zablokuje |
| `tool-args`        | brána                 | argumenty z modelu jsou nedůvěryhodné, validuje je zod schéma nástroje                                             |
| `step-budget`      | před voláním modelu   | nejvýš 5 volání modelu na běh                                                                                      |
| `token-budget`     | před voláním modelu   | nejvýš 80 000 tokenů (vstup + výstup) na běh                                                                       |
| `loop-detection`   | brána + po nástroji   | třetí stejné volání nebo tři chyby téhož nástroje po sobě ukončí běh                                               |
| `pii-pseudonymize` | vše, co jde do modelu | `pii-cz` + přesná shoda s už známými hodnotami; argumenty nástrojů a odpověď se re-identifikují lokálně            |
| `untrusted-output` | po nástroji           | výstup je ohraničený jako `<tool_output trust="untrusted">`                                                        |
| `prompt-injection` | po nástroji           | heuristika nad každým textovým polem; podezřelé pole se modelu nepředá                                             |
| `content-advice`   | vstup + odpověď       | žádost o investiční doporučení odmítne bez volání modelu; doporučení v odpovědi nahradí                            |
| `human-approval`   | brána                 | `draft_email` čeká na rozhodnutí člověka; ten vidí skutečný obsah, model a trace jen pseudonymy                    |

Limity jsou designová volba (`DEFAULT_POLICY`), ne měření. Každá nahrávka ukládá hodnoty, se
kterými běžela. Heuristiky (injekce, doporučení) zachytí zjevné případy. Vrstvy, které na nich
nezávisí, jsou allowlist a schválení člověkem.

**Guardrails vypnuté** (`createPassthroughPolicy`) znamenají stejný prompt bez pravidel. Nástroje
pořád validují svůj vlastní vstup a koncept e-mailu se ani tak nikam neodešle.

## Nahrávky (`recording.ts`)

`createRecorder` při nahrávání uloží ke každému volání otisk požadavku (SHA-256) a odpověď.
`replayRecording` pak pustí loop, pravidla, nástroje i `pii-cz` znovu a z nahrávky bere jen
odpovědi modelu a rozhodnutí člověka. S `verifyRequest` selže, když kód posílá něco jiného, než na
co model odpovídal, nebo když nespotřebuje všechny nahrané kroky. Nahrávky vytváří
[`scripts/record-agent.ts`](../../scripts/record-agent.ts).
