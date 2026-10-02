---
source: src/app/vue-error-handler.ts
sha256: 1063915f43ba870458051d9b2b1158119db2136d0189453c994f79e426086575
generated_at: 2026-10-02T11:52:18.711945+00:00
model: ollama:qwen3.8:27b
---

# src/app/vue-error-handler.ts

## Purpose

Implements the Vue application's global `app.config.errorHandler` — the last-resort catch for errors thrown inside a component's render/setup/watcher that no local handler intercepts. Reports the error to the Faro observability pipeline and surfaces a translated user-facing notification, so a visitor never sees a blank page with only a console stack trace (FA74).

## Key elements

- **`handleUncaughtVueError(error, instance, info)`** (exported const) — The single entry point, matching Vue's `errorHandler` signature. It:
  - Logs the error via `logger.error('[Vue]', info, error)`.
  - Calls `useObservabilityStore().captureException(...)` to send the error to Faro.
  - Pushes a translated generic-error message into `useNotificationsStore()` for the UI.
  - Wraps the store calls in a `try/catch` that swallows any secondary failure (e.g. stores not yet initialized during bootstrap), ensuring the original error is never masked.

## Relationships

No graph neighbors are recorded. The function is consumed by `main.ts` (which assigns it to `app.config.errorHandler`), and it pulls in the observability store, notifications store, i18n translator, logger, and the `GENERIC_ERROR_KEY` constant.

## Notes

- The `instance` parameter is accepted for signature compatibility but intentionally unused — Faro receives the error object, not the originating component.
- The `try/catch` around store access is deliberate and eslint-suppressed: an error thrown *during app bootstrap* (before `setActivePinia` runs) would otherwise cause the reporting path itself to throw, replacing the original error.
- Non-`Error` throws are coerced with `new Error(String(error))` before being passed to `captureException`.
- The file exports exactly one function and has no class or state of its own, making it trivially unit-testable.
