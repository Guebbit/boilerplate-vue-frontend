---
source: src/modules/webhooks/tests/store.spec.ts
sha256: 93bc38927a2a79269b21dcfc4996efc34342009bb0d7c1f7a33742cb99347912
generated_at: 2026-10-02T15:55:55.766111+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/store.spec.ts

## Purpose

Unit tests for the `useWebhooksStore` Pinia store. It mocks `orvalMutator` (the HTTP transport) to assert the exact requests each store action emits, and — uniquely in this file — verifies that the plaintext `secret` / `newSecret` fields returned by `createSubscription` and `rotateSecret` are handed to the caller but **never** retained in the store's cached state.

## Key elements

- **`vi.mock('@/infrastructure/http', …)`** – replaces `orvalMutator` with a configurable mock; by default returns a full `SUBSCRIPTION` record (or an empty envelope for bare subscription DELETEs).
- **`lastRequest()` / `lastBody(schema)` / `lastParameters()`** – helpers that inspect the most recent `orvalMutator` call: URL, method, validated body, and query params.
- **`respondWithItems(items)`** – overrides the mock to return a paginated envelope for list-type responses.
- **`respondOnceWith(data)`** – one-shot override returning `data` verbatim; needed for create/rotate envelopes that carry `secret`/`newSecret` fields absent from the standard record fixture schema.
- **`flush()`** – `flushPromises().then(() => nextTick())`; used by `watchSubscription` tests because the backfill fires via `void` (no chainable promise) and the cache write lands several microtask/macrotask turns later.
- **`describe` blocks** – one per store action (`createSubscription`, `rotateSecret`, `removeSecret`, `updateSubscription`, `deleteSubscription`, `replayDelivery`, `watchSubscription`), each asserting route, method, body, and (where applicable) state-shape invariants.

## Relationships

- **`src/infrastructure/http/index.ts`** – the sole mocked module; `orvalMutator` is the seam through which every request is intercepted and inspected.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module top-level to register the store's DI dependencies before any test runs.
- **`tests/support/stub.ts`** – provides `asStub`, used to safely cast the last request's `params` field.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – supplies `parseOrvalFixture`, `orvalEnvelope`, and `contractRequest`; the three building blocks for shaping mock responses and validating request bodies against API schemas.

## Notes

- **Return-don't-await convention:** every `it` returns its promise chain instead of using `async/await`. Vitest treats a rejected returned promise as a test failure, so assertions inside `.then` are equally binding. This is a project-wide convention documented in `docs/tools/unit-testing.md`.
- **`respondOnceWith` vs. the default mock:** the default mock routes through `parseOrvalFixture` → `orvalEnvelope(record)`, which validates against the *record* schema. Create and rotate responses carry extra fields (`secret`, `newSecret`) that only exist on the dedicated response schemas, so `respondOnceWith` bypasses that validation path.
- **`flush()` is load-bearing for `watchSubscription`:** `nextTick` alone is insufficient because the cache write occurs behind the query layer, several turns after the request resolves. The backfill is fire-and-forget (`void`), leaving no promise to chain.
- **Secret-removal DELETE is treated differently in the default mock:** a bare subscription `DELETE` returns an empty envelope, while a `DELETE` on `/secrets/…` returns the full record — mirroring the real API's asymmetric responses.
