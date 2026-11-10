---
source: src/infrastructure/utils/use-blocking-error.ts
sha256: c016af4cb58ac0efe05698ac1c9ccd727415afbde484571f0b58d95a870928d0
signature: ae5f0a17cd97ab24cc6ffe7a38fb01bcb9ae08817d8e5a4a3058ec645d98d6b6
generated_at: 2026-11-10T03:14:34.176942+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/use-blocking-error.ts

## Purpose

A Vue composable that gives a single blocked workflow (save, delete, refund, lookup) its own local error state. Instead of pushing a message into the shared toast queue, the message stays attached to the form or panel that was stopped, rendered by `InlineErrorAlert`. Real failures are still captured in Faro; expected-absence warnings are not. It lives in `infrastructure/utils` rather than `ui/composables` because it reaches into the observability store, which the UI tier is not allowed to import (eslint tier-boundary rules).

## Key elements

- **`useBlockingError()`** — The composable. Returns a `UseBlockingErrorReturn` object containing reactive `message` / `type` refs and three actions.
- **`UseBlockingErrorReturn`** (interface) — Describes the composable's return shape: `message: Ref<string | undefined>`, `type: Ref<'error' | 'warning'>`, `report`, `warn`, `clear`.
- **`report(error: unknown)`** — Sets `type` to `'error'`, derives the user-facing string via `getErrorMessage`, and forwards the raw error to `useObservabilityStore().captureException` (Faro).
- **`warn(text: string)`** — Sets `type` to `'warning'` and stores the already-translated `text` directly. Does **not** report to Faro; intended for "lookup returned nothing" situations.
- **`clear()`** — Resets `message` to `undefined`. Typically called by the caller just before retrying.
- **`message` / `type` refs** — Read by `InlineErrorAlert` to decide whether and how to render. `type` is meaningless while `message` is unset.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Graph neighbor. Not imported directly by this file; the connection is indirect, most likely through `errors.ts` (imported for `getErrorMessage`) or through the observability store's capture pipeline, either of which may delegate structured logging to the logger.

## Notes

- **Caller clears on success.** The composable only ever writes `message` via `report` or `warn`; the view is responsible for setting it back to `undefined` after a subsequent successful call. `clear()` is provided as a convenience for the "about to retry" moment.
- **`report` vs `warn` is an observability decision, not just a cosmetic one.** `report` → Faro; `warn` → no Faro capture. Do not use `report` for an expected-empty lookup.
- **Tier boundary is load-bearing.** Moving this file into `ui/composables` would violate the eslint rule that prevents `ui` from importing observability. See `eslint.config.ts` and `docs/theory/request-flow.md` for the full pairing guidance.
