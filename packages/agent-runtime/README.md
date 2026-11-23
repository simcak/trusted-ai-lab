# agent-runtime

> Připravuje se ve **fázi 3**. Zatím jen místo ve struktuře repa, bez kódu.

Vlastní agent loop bez frameworku (max. 6 kroků) a policy engine jako samostatná vrstva:
allowlist nástrojů podle persony, validace argumentů, rozpočty kroků a tokenů, detekce smyček,
pseudonymizace přes `pii-cz` a auditní log. Každé rozhodnutí je `TraceEvent` z `@trusted-ai-lab/llm-core`.
