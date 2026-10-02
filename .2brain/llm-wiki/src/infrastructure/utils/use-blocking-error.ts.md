---
source: src/infrastructure/utils/use-blocking-error.ts
sha256: c016af4cb58ac0efe05698ac1c9ccd727415afbde484571f0b58d95a870928d0
generated_at: 2026-10-02T12:06:30.405635+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/use-blocking-error.ts

## Purpose

A Vue composable that holds the inline (non-toast) half of blocking-workflow error state — the message a save, delete, refund, or empty-lookup produces that must stay rendered next to the offending form or panel rather than scrolling away in the toast queue. It pairs with `InlineErrorAlert` (`src/ui/molecules/`) the same way `notifyErrorMessages` pairs with a toast: real failures still reach Faro, but the user-facing text is local. It lives in `infrastructure/utils` (not `ui/composables`) because it reaches into the observability store, which the tier-boundary rules in `eslint.config.ts` forbid `ui` from importing.

## Key elements

- **`useBlockingError()`** — the single exported composable. Returns a `UseBlockingErrorReturn` object with reactive `message` / `type` refs and three actions.
- **`UseBlockingErrorReturn`** — the return-type interface. Documents the shape callers can rely on.
- **`report(error: unknown)`** — sets `type` to `'error'`, derives the display string via `getErrorMessage` (from `errors.ts`), and forwards the raw value to `useObservabilityStore().captureException()` (Faro).
- **`warn(text: string)`** — sets `type` to `'warning'` and stores already-translated copy. Deliberately does **not** call the observability store; an empty lookup is not an exception.
- **`clear()`** — resets `message` to `undefined`. Callers are expected to invoke this (or set `message` themselves) on the next successful attempt.

## Relationships

- **`src/infrastructure/utils/errors.ts`** (same directory, not in the neighbor list but a direct import) — supplies `getErrorMessage`, which normalises a thrown value into a user-facing string. The doc block also names `notifyErrorMessages` from that file as the toast-side counterpart.
- **`src/infrastructure/utils/logger.ts`** (graph neighbor) — same-directory sibling; no direct import in this file. The connection is likely transitive through `errors.ts` or the observability store, but this file does not reference `logger.ts` by name.
- **`@/infrastructure/observability/store.ts`** — the only observability entry point; `report` calls `captureException` on it. This is the reason the file must sit in `infrastructure` rather than `ui`.
- **`InlineErrorAlert`** (`src/ui/molecules/`) — the UI component that consumes the `message` / `type` refs returned here. No import exists in this file; the coupling is purely by convention.

## Notes

- `report` and `warn` are mutually exclusive per call; `type` is a simple two-value ref, not a discriminated union. `InlineErrorAlert` reads `type` to choose its colour.
- The composable never clears on its own. If a caller forgets to call `clear` (or overwrite `message`) before retrying, a stale error will persist across attempts.
- `warn` intentionally bypasses Faro. Do not use it for genuine exceptions; use `report` instead so monitoring sees the event.
- The file is annotated `@module` and has no default export — it is a namespace of named exports only.
