---
source: tests/unit/infrastructure/utils/use-missing-record.spec.ts
sha256: fc2eaabccc8938a93f4762440bf01c6e496ffaf0fa7dcf690c3fdd2195db9ee5
signature: 250f7d416b0c438100d1aaf2cfef2118705a3eff9d9084f216def742b7adcf9a
generated_at: 2026-11-10T08:08:49.912385+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/utils/use-missing-record.spec.ts

## Purpose
Unit tests for the `useMissingRecord` hook, verifying its branching logic: a 404 or 403 response triggers a router redirect to the Error page, while any other failure (e.g. 500, network error) triggers a toast notification and an exception capture without leaving the page. All external dependencies (router, toast store, observability, i18n) are stubbed so the only behavior under test is which of the two paths a given status/error selects.

## Key elements
- **`describe('useMissingRecord')`** — four test cases:
  - *404* → `router.replace` called with route `Error`, params `{ locale: 'it', status: 404, message: 'error-page.not-found' }`; toast **not** called.
  - *403* → `router.replace` called with `message: 'navigation.error-forbidden'`.
  - *500 (with `errors` array)* → toast called with `'boom'`, `captureException` called with the full error object, router **not** called.
  - *Network-level `Error`* → toast called, router **not** called.
- **`replaceMock`** — `vi.fn` standing in for `router.replace`.
- **`addMessageMock`** — `vi.fn` standing in for the notification store's `addMessage`.
- **`captureExceptionMock`** — `vi.fn` standing in for the observability store's `captureException`.
- **`vi.mock` blocks** — stub `vue-router`, `@guebbit/vue-toolkit`, `@/infrastructure/observability/store.ts`, and `@/i18n` (translate is an identity function).

## Relationships
No graph neighbors are recorded for this file. All external imports (`vue-router`, `@guebbit/vue-toolkit`, `@/infrastructure/observability/store.ts`, `@/i18n`) are fully mocked via `vi.mock`, and the sole module under test (`@/infrastructure/utils/use-missing-record.ts`) is imported for its public export `useMissingRecord`.

## Notes
- The i18n mock is an identity function, so assertions compare raw i18n keys (e.g. `'error-page.not-found'`) rather than translated strings.
- The router mock hard-codes `locale` to `'it'`; tests assert that the hook reads the locale from the current route params rather than hard-coding it.
- `vi.clearAllMocks()` runs in `beforeEach` to keep assertions isolated between cases.
