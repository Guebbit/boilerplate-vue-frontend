---
source: src/app/vue-error-handler.ts
sha256: b9b4996a7cf0447a261554365f0d03acfefd17c7c7847cd2cfb3e06c93c1f9c0
generated_at: 2026-10-17T00:07:41.598842+00:00
model: ollama:qwen3.8:27b
---

# src/app/vue-error-handler.ts

## Purpose

Last-resort global error handler for the Vue app. When a component's render, setup, or watcher throws and nothing downstream catches it, this function logs the error, reports it to Faro, and shows the visitor a localized "something went wrong" notification instead of a blank page. Wired into the app via `app.config.errorHandler` in `main.ts`.

## Key elements

- **`handleUncaughtVueError(error, instance, info)`** — The sole export. Matches Vue's `app.config.errorHandler` signature. Logs with the `[Vue]` prefix, captures the exception through the observability store (wrapping non-`Error` values), and pushes a generic error notification via the `@guebbit/vue-toolkit` notifications store.

## Relationships

No graph neighbors are recorded for this file. At runtime it interacts with:

- **`main.ts`** — registers `handleUncaughtVueError` as `app.config.errorHandler`.
- **`@/infrastructure/observability/store.ts`** — calls `captureException` to send the error to Faro.
- **`@guebbit/vue-toolkit`** (`useNotificationsStore`) — displays the user-facing toast.
- **`@/i18n`** / **`@/app/utils/error-messages.ts`** — resolves the generic error string via `GENERIC_ERROR_KEY`.
- **`@/infrastructure/utils/logger.ts`** — structured logging of the error and lifecycle context.

## Notes

- The `instance` parameter is intentionally unused; Faro receives the error itself, not the originating component.
- A `try/catch` wraps both store calls because the handler can fire during app bootstrap, before `setActivePinia` has run. If the stores aren't ready, the original error must not be masked by a secondary throw. An ESLint suppression marks this as deliberate.
- Non-`Error` thrown values (e.g. a raw string) are coerced via `new Error(String(error))` before being passed to the observability store.
