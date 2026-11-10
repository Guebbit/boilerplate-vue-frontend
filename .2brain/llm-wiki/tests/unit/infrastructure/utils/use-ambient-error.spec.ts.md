---
source: tests/unit/infrastructure/utils/use-ambient-error.spec.ts
sha256: 062e652ad6ed7834393f7acab1b04b917a3c4f4c965d52670dd4e98d47c43af4
signature: c90062a7552c8669a8714aba57b090bd0964e86eab91a056ea403a4bb13d4e25
generated_at: 2026-11-10T08:08:01.864897+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/use-ambient-error.spec.ts

## Purpose

Unit tests for the `useAmbientError` composable, which handles errors from fire-and-forget reads that have no dedicated view to display them in. The tests verify that a failure both surfaces a user-facing toast and reports the original error to the observability pipeline, including the case where no API response was ever received (e.g., network failure).

## Key elements

- **`addMessageMock`** — Vitest `vi.fn()` stub standing in for the toast dispatcher (`useNotificationsStore().addMessage`).
- **`captureExceptionMock`** — Vitest `vi.fn()` stub standing in for the observability store's `captureException`.
- **Module mocks (`vi.mock`)** — Replace `@guebbit/vue-toolkit` (toast store), `@/infrastructure/observability/store.ts` (observability store), and `@/i18n` (identity `translate`) so the SUT runs without real stores or i18n.
- **`describe('useAmbientError')`** — Two test cases:
  - *toasts the API message and reports the original error* — passes a structured `{ status: 500, errors: [{ message: 'boom' }] }` object and asserts the toast receives the human-readable message while observability receives the full original error.
  - *toasts a failure that never got an answer* — passes a bare `Error('offline')` and asserts the toast is invoked once.

## Relationships

None — no graph neighbors are recorded for this file.

## Notes

- The `i18n` mock is an identity function (`key → key`), so tests can assert on the raw message string without knowing the i18n key.
- `vi.clearAllMocks()` runs in `beforeEach`; there is no `vi.restoreAllMocks()`, so the module-level mock functions are shared across both tests and rely on `clearAllMocks` for isolation.
- The first test asserts the toast gets the *extracted* message (`'boom'`) while observability gets the *original* structured error object — the two consumers intentionally receive different shapes.
