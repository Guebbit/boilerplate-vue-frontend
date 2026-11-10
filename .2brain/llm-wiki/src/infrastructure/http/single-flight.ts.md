---
source: src/infrastructure/http/single-flight.ts
sha256: db69dab65135cfc90455e4de2e2aace2e70b1fa5a9ee2eeab204c502b9252a66
signature: e8e14a6ff46060e9fccde93e2ac254a7347f3ac0dee71ca811b944833c6ead95
generated_at: 2026-11-10T03:06:17.289909+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/single-flight.ts

## Purpose

Provides two small combinators that guarantee concurrent callers of an async operation share a single in-flight promise instead of each kicking off a duplicate request. Exists so that token renewal (`refresh.ts`) and reauth prompts (`step-up.ts`) — and any button-driven action lacking an `Idempotency-Key` — can coalesce overlapping triggers into one network call.

## Key elements

- **`singleFlight<T>(start: () => Promise<T>)`** — Returns a zero-arg thunk. The first caller kicks off `start`; any caller that arrives before that promise settles receives the *same* promise. Once it settles (resolve or reject), the slot clears and the next call starts fresh.
- **`exclusiveRunner()`** — Returns a runner function `(<T>(start: () => Promise<T>) => Promise<T>)`. Same de-duplication semantics as `singleFlight`, but the action is passed at call time rather than captured at construction. Typed as `Promise<unknown>` internally; the joiner's `T` is cast to the first caller's result type.

## Relationships

- **`src/infrastructure/http/step-up.ts`** — The module doc comment names `step-up.ts`'s reauth prompt as a direct consumer: when a user re-triggers a step-up while the initial prompt is still in flight, the second call joins the first rather than opening a second prompt.

## Notes

- `singleFlight` is fire-and-forget regarding *which* caller's `start` runs: the first caller's invocation wins; later callers never invoke `start` at all.
- `exclusiveRunner` shares one slot across *different* action functions (the `start` argument varies per call). If two genuinely different actions are in flight simultaneously, the second still joins the first's promise — this is intentional for the "one button-press at a time" use case.
- Both implementations use `.finally()` to clear `inFlight`, so a rejection does not permanently block subsequent calls.
- The generic type parameter on `exclusiveRunner`'s returned function is structural: a later caller's `T` is only used for the *await* type, not for the value actually resolved.
