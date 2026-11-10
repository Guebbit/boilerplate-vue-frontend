---
source: tests/unit/infrastructure/reauth.spec.ts
sha256: 6814779a7f15058961742bcf918190c6b7b28dfa43f08b8907df968e994f8f0a
signature: f80f7539f4e9442df5660b5f598971277381fb75b2e210ea97bfdd040d5b984b
generated_at: 2026-11-10T08:02:55.274840+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/infrastructure/reauth.spec.ts

## Purpose

Unit tests for the step-up re-proof store (`useReauthStore`) and its two helper functions in `src/infrastructure/reauth.ts`. Verifies that a successful reauth swaps the token in the session store and a refused reauth leaves the existing token untouched, while the `reauthing` flag tracks in-flight state. Only the `@api` network boundary is mocked; the Pinia stores themselves run for real.

## Key elements

- **`reauthMock` / `getReauthMethodsMock` / `sendReauthCodeMock`** — Deliberately untyped `vi.fn()` stubs. Their return shapes bypass the Orval-generated types that would reject ad-hoc fixture data.
- **`vi.mock('@api', …)`** — Factory mock replacing the generated client with the three stubs above.
- **`await import('@/infrastructure/reauth.ts')`** — Top-level dynamic import that pulls in `reauthMethods`, `sendReauthCode`, and `useReauthStore` *after* the mock is registered.
- **`await import('@/infrastructure/session.ts')`** — Dynamic import of `useSessionStore` used in assertions (token swap check).
- **`beforeEach`** — Resets Pinia (`createPinia`) and clears all mocks before each test.
- **`describe('reauth')`** — Two tests: success path (token adopted, flag raised then cleared) and refusal path (flag cleared, old token preserved).
- **`describe('reauthMethods and sendReauthCode')`** — Two tests: listing available methods and resolving `sendReauthCode` with the server's `resendAfter` cooldown value.

## Relationships

- **`tests/support/unit/orval-fixture-schema.ts`** — Supplies the `contractResponse` helper, which wraps a plain fixture object into the response envelope the Orval-generated client expects. Used in every test that sets a mock resolved/rejected value.

## Notes

- Mocks are intentionally **untyped** (`vi.fn()` with no generic parameter). A comment and an `eslint-disable` acknowledge that the generated request/response types are too strict for the ad-hoc fixture shapes used here.
- The top-level `await import(…)` is required: the store module captures `@api` at import time, so the mock must be in place *before* the import executes.
- The `reauthing` flag is asserted in three distinct moments: `true` while the promise is pending, and `false` after both resolution and rejection.
- `sendReauthCode` is asserted to return only the `resendAfter` number, not the full response object — the store extracts the cooldown for the UI.
