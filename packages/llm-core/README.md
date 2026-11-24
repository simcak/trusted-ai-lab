# llm-core

> **EN:** Provider-neutral LLM interface shared by all modules: `LlmProvider` with a deterministic
> `ReplayProvider` (default, offline) and an Anthropic BYOK provider over the official SDK,
> recordings with a per-step request hash for drift detection, and trace events that every module
> renders with the shared `TracePanel`.

```ts
interface LlmProvider {
  id: 'replay' | 'byok-anthropic' | 'byok-openai' | 'webllm';
  complete(req: LlmRequest, signal?: AbortSignal): Promise<LlmResponse>;
}
```

| Co                                                    | Kde                           | Poznámka                                                                                                                        |
| ----------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Zprávy, nástroje, odpověď                             | `types.ts`                    | `system` je pole požadavku; asistent nese `toolCalls` a neprůhledný `providerState` (thinking bloky), který se vrací beze změny |
| `ReplayProvider`                                      | `replay-provider.ts`          | odpovídá z nahrávky podle `scenario + step`; s `verifyRequest` porovná otisk požadavku a při rozdílu hodí `ReplayDriftError`    |
| `hashRequest`                                         | `request-hash.ts`             | SHA-256 kanonického požadavku (bez `context` a `providerState`): detekce nesouladu, ne ochrana proti úpravám                    |
| Nahrávka                                              | `recording.ts`                | `kind: recorded \| fixture`, model, datum, verze promptu; každý krok nese otisk, odpověď a model, který ho obsloužil            |
| Trace                                                 | `trace.ts`, `with-tracing.ts` | `withTracing(provider, log)` zapíše každé volání; `providerState` do trace nikdy nejde                                          |
| BYOK Anthropic (`@trusted-ai-lab/llm-core/anthropic`) | `anthropic-provider.ts`       | samostatná podcesta, aby SDK nebylo v úvodním bundlu                                                                            |

## BYOK z prohlížeče

Podle [dokumentace Anthropic](https://platform.claude.com/docs/en/manage-claude/authentication#browser-based-applications)
(ověřeno 2026-11-24) se API má volat z backendu. Přímé volání z prohlížeče je CORS požadavek a API
ho přijme jen s hlavičkou `anthropic-dangerous-direct-browser-access: true`, kterou SDK pošle
s `dangerouslyAllowBrowser: true`. Organizace se zero data retention nebo Compliance API dostanou
i s platným klíčem `401` („CORS requests are not allowed for this Organization“). Provider tuto
chybu mapuje na kód `cors_forbidden`.

Riziko a jak ho demo zmenšuje:

- Klíč je jen v objektu provideru v paměti stránky. Není v požadavku, trace, chybové hlášce ani v
  logu (`logLevel: 'off'`). Stránka ho neukládá a zahodí ho tlačítkem i při odchodu.
- Stránka doporučuje klíč s krátkou platností (předvolba 3 h) ve zvláštním workspace se spend limitem.
- BYOK je volitelný. Výchozí režim je replay bez klíče a bez sítě.
