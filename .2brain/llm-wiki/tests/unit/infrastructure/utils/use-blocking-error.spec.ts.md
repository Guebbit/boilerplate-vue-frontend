---
source: tests/unit/infrastructure/utils/use-blocking-error.spec.ts
sha256: 7f52dfca2a76390a61f33fe301a3bc8d2f7ac4601fd5100b293178ca514b2a28
generated_at: 2026-10-17T02:40:12.818040+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/use-blocking-error.spec.ts

## Purpose

Unit tests for the `useBlockingError` composable. It verifies the three public methods (`report`, `warn`, `clear`) and — most importantly — asserts the behavioural boundary that `warn` must **not** report to Faro while `report` **must**. The observability store is fully mocked because the real `captureException` is a no-op until Faro connects, which would make any assertion against it pass vacuously.

## Key elements

- **`captureExceptionMock` / `vi.mock('@/infrastructure/observability/store.ts', …)`** — Replaces the observability store with a plain `vi.fn()` so tests can assert call/no-call against Faro without depending on a live connection.
- **`describe('report()')`** — Asserts `message` is set from the `Error`'s message, `type` becomes `'error'`, and `captureException` is called with the original error object.
- **`describe('warn()')`** — Asserts `message` is set from a plain string, `type` becomes `'warning'`, and `captureException` is **not** called (expected absence, not failure).
- **`describe('clear()')`** — Asserts `message` resets to `undefined` after a prior `report`, and that calling `clear` on a fresh instance is safe.
- **`describe('independent instances')`** — Confirms each call to `useBlockingError()` returns its own state; one instance's `report` does not leak into another.

## Relationships

The dependency graph records no neighbours. The file does import `useBlockingError` from `@/infrastructure/utils/use-blocking-error.ts` (the SUT) and mocks `@/infrastructure/observability/store.ts`; neither of those edges is reflected in the recorded graph.

## Notes

- The file-header comment deliberately contrasts this spec with `errors.spec.ts` (for `notifyErrorMessages`), where the assertion is the **inverse**: Faro *must* be called. Both files share the same mocking rationale.
- `beforeEach` uses `vi.clearAllMocks()` rather than resetting individual spies, so the `captureException` mock is fresh each test without manual bookkeeping.
- The "independent instances" block guards against an accidental shared-module-level state implementation of `useBlockingError`; if the composable ever regresses to a singleton, that test is the first to fail.
