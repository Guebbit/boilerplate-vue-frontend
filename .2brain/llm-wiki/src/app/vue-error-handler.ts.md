---
source: src/app/vue-error-handler.ts
sha256: b9b4996a7cf0447a261554365f0d03acfefd17c7c7847cd2cfb3e06c93c1f9c0
signature: 4e8bb7bb40f0f0e15bf15dd5108dd39d036014b88952312a0388e6648c166cac
generated_at: 2026-11-10T02:59:56.115326+00:00
model: ollama:qwen3.8:27b
---

# src/app/vue-error-handler.ts

## Purpose

Implements the Vue app's global `app.config.errorHandler` — the last-resort catch for errors thrown during a component's render, setup, or watcher that no local error boundary handles. Instead of leaving the user a blank page, it logs the error, reports it to Faro, and shows a generic notification.

## Key elements

- **`handleUncaughtVueError(error, instance, info)`** — The sole export. Matches Vue's `errorHandler` signature. On call it:
  1. Logs the error via the project `logger` with the lifecycle-hook `info` string.
  2. Wraps the reporting in a `try/catch` (to survive bootstrap-phase errors where Pinia stores aren't yet active).
  3. Sends the error to Faro through `useObservabilityStore().captureException`.
  4. Pushes a translated generic-error message via `useNotificationsStore().addMessage`.

## Relationships

No graph neighbors recorded.

## Notes

- The `instance` parameter is accepted for signature compatibility but **not used** in the implementation.
- The `try/catch` around store access is deliberate: an error thrown *during* app bootstrap (before `setActivePinia`) would otherwise cause the handler itself to throw a second, masking error. The `eslint-disable-next-line no-restricted-syntax` comment documents why the bare `catch` (no binding) is intentional here.
- Non-`Error` thrown values are coerced via `new Error(String(error))` before being passed to Faro.
- This file is the single place the handler's behavior is described and tested; `main.ts` wires it in one line.
