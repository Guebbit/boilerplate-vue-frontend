---
source: tests/unit/infrastructure/utils/use-blocking-error.spec.ts
sha256: 7f52dfca2a76390a61f33fe301a3bc8d2f7ac4601fd5100b293178ca514b2a28
signature: 697c065b4137e7b7a27f55dbd208873a20885e33cdd002ec46bb95c148fd69d8
generated_at: 2026-11-10T08:08:17.857160+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/use-blocking-error.spec.ts

## Purpose

Unit tests for the `useBlockingError` composable. The central concern is pinning the one behavioral split that distinguishes this hook from `notifyErrorMessages`: `report()` must forward the error to Faro, while `warn()` must not. The observability store is stubbed because the real `captureException` is a no-op until Faro connects, so asserting against it would pass vacuously.

## Key elements

- **`captureExceptionMock`** — `vi.fn()` that stands in for the observability store's `captureException`; all Faro-reporting assertions are made against it.
- **`vi.mock('@/infrastructure/observability/store.ts', …)`** — replaces the store module so every hook call receives the mock.
- **`describe('report()')`** — verifies `message` is set from the `Error` argument, `type` is `"error"`, and `captureException` is called with the original error object.
- **`describe('warn()')`** — verifies `message` is set from a plain string, `type` is `"warning"`, and `captureException` is **not** called.
- **`describe('clear()')`** — verifies `message` resets to `undefined` after a prior `report()`, and that calling `clear()` on a fresh instance is safe.
- **`describe('independent instances')`** — confirms two consecutive `useBlockingError()` calls hold isolated state (reporting on one does not affect the other).

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The file's top-level comment explicitly justifies the mock: without it, a regression where `report()` silently drops the Faro call would still pass the test.
- `beforeEach` calls `vi.clearAllMocks()` so the "not called" assertion in the `warn()` suite is meaningful across test runs.
- The independence test implicitly guards against an implementation that accidentally shares a module-level `ref`, which would leak state across hooks in the same component tree.
