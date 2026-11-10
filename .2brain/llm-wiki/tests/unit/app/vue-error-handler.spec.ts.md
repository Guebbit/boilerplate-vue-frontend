---
source: tests/unit/app/vue-error-handler.spec.ts
sha256: 17f1cbe872c1bebe851d9090f6f2db5bd3131c3007cf6a12d7589b42de464d3e
signature: c46c65a7c801f9810a580b227fec79db7c9372784c8c4df6d27e7fcd098f4313
generated_at: 2026-11-10T07:52:20.159308+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/vue-error-handler.spec.ts

## Purpose

Unit tests for `handleUncaughtVueError` (the `app.config.errorHandler` implementation), verifying that an uncaught Vue error is forwarded to Faro, surfaces a user-facing toast, and never throws a secondary error that would mask the original.

## Key elements

- **`handleUncaughtVueError`** (imported from `@/app/vue-error-handler`) — the function under test.
- **`captureException`** — `vi.fn()` stub replacing `useObservabilityStore().captureException`; asserts Faro receives the original `Error` or a wrapped `Error` for non-Error throws.
- **`addMessage`** — `vi.fn()` stub replacing `useNotificationsStore().addMessage`; asserts the toast payload is `GENERIC_ERROR_KEY`, never the raw thrown value.
- **`translate`** — mocked as identity so assertions read the dictionary key rather than a localized string.
- **Four test cases** covering: (1) Error instance passed through unchanged, (2) non-Error values wrapped into an `Error`, (3) toast uses the generic i18n key, (4) the handler does not throw even when `captureException` itself throws (e.g. Pinia not yet active).

## Relationships

No graph neighbors are recorded for this file. It directly imports `@/app/vue-error-handler` (SUT), `@/app/utils/error-messages` (`GENERIC_ERROR_KEY`), and vitest, and mocks `@/infrastructure/observability/store.ts`, `@guebbit/vue-toolkit`, and `@/i18n` via `vi.mock`.

## Notes

- `translate` is intentionally stubbed as an identity function; any assertion on `addMessage` is comparing against the raw key, not a translated string.
- The "does not throw" test uses `mockImplementationOnce`, so only the *first* call to `captureException` throws; subsequent calls in the same `describe` block are unaffected thanks to `vi.clearAllMocks()` in `beforeEach`.
- The handler's contract is deliberately defensive: it must swallow its own failures so Vue's error-handling pipeline is never derailed by a second exception.
