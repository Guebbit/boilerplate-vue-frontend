---
source: tests/unit/app/vue-error-handler.spec.ts
sha256: 17f1cbe872c1bebe851d9090f6f2db5bd3131c3007cf6a12d7589b42de464d3e
generated_at: 2026-10-17T02:33:15.842579+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/vue-error-handler.spec.ts

## Purpose

Unit tests for `handleUncaughtVueError` (the app-level `app.config.errorHandler`). They verify that an error thrown by a Vue component's render/setup/watcher is reported to the observability store (Faro), surfaces a generic toast to the user, and — critically — that the handler itself never throws a secondary error.

## Key elements

- **Mocked collaborators** (set up at module level via `vi.mock`):
  - `captureException` — stand-in for the observability store's exception-reporting method.
  - `addMessage` — stand-in for the toast/notification dispatcher (`@guebbit/vue-toolkit`).
  - `translate` — identity function from `@/i18n`, so assertions compare against the i18n *key* rather than a rendered string.
- **`describe('handleUncaughtVueError')`** — four cases:
  1. *Reports a thrown `Error` to Faro as itself* — asserts `captureException` received the original `Error` instance.
  2. *Wraps a non-`Error` throw* — passing a raw string still results in `captureException` receiving an `Error` instance.
  3. *Toasts the generic error message* — asserts `addMessage` is called with `GENERIC_ERROR_KEY` (from `@/app/utils/error-messages`), never the raw thrown value.
  4. *Does not throw when a store is not ready* — `captureException` is made to throw once (simulating an inactive Pinia store); the handler must not propagate that.
- **`beforeEach`** — calls `vi.clearAllMocks()` to reset call history between tests.

## Relationships

No graph neighbors were reported. The file imports directly from:

- `@/app/vue-error-handler` (the unit under test)
- `@/app/utils/error-messages` (for `GENERIC_ERROR_KEY`)
- `@/infrastructure/observability/store.ts`, `@/guebbit/vue-toolkit`, `@/i18n` (all mocked)

## Notes

- The `translate` mock is deliberately an **identity function** so that test assertions can assert against the raw i18n dictionary key. If you add an assertion that compares the *translated* text, this mock will make it fail.
- Test 4 simulates an unready Pinia store by using `mockImplementationOnce` to make `captureException` throw; this is the key regression guard for the "handler must never throw" contract.
- The toast always uses `GENERIC_ERROR_KEY`; there is no test for per-error-type messages, implying the handler intentionally hides implementation detail from the user.
