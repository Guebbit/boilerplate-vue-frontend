---
source: src/infrastructure/http/single-flight.ts
sha256: 444e9a60923b24fc287cedc557c56269275cf284c34404543139d90d1bb54d5f
generated_at: 2026-10-02T11:58:37.254443+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/http/single-flight.ts

## Purpose

Provides a minimal single-flight (request coalescing) wrapper so that concurrent callers of an async operation share one in-flight promise instead of each kicking off a duplicate. It exists to de-duplicate work that must happen at most once at a time—token refresh, reauth prompts—without pulling in a full library.

## Key elements

- **`singleFlight<T>(start: () => Promise<T>): () => Promise<T>`** — The sole export. Accepts a zero-arg function that begins the operation and returns a new zero-arg function. The first call invokes `start`; any subsequent call made before that promise settles receives the *same* promise. Once the promise settles (success or failure), the internal reference is cleared so the next call starts a fresh attempt.

## Relationships

- **`src/infrastructure/http/step-up.ts`** — Consumes `singleFlight` to ensure that if multiple callers trigger a reauth prompt simultaneously, only one prompt flow runs and the others await its result.

## Notes

- The in-flight slot is cleared in a `.finally()` callback, so the guard resets on **both** resolution and rejection. A failed attempt does not block a subsequent retry.
- `start` is always invoked with no arguments; if the caller needs to pass a value, it must close over it.
- The implementation is a plain closure (no class, no singleton registry). Each call to `singleFlight` creates an independent guard—two separate wrappers do not share state.
- The module docblock also references `refresh.ts` (token renewal) as another consumer, but that file is not in the current dependency graph for this page.
