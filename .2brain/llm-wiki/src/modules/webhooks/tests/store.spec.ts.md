---
source: src/modules/webhooks/tests/store.spec.ts
sha256: 36c38a0b5f1385bf2217d84d1999407e5eb83868520ff9a569be7a0b168ab90d
signature: 6016700dafae1d8f491a00a37c0e12d6514133da7875390b8518d6212a08a74b
generated_at: 2026-11-10T06:15:59.712320+00:00
model: ollama:qwen3.8:27b
---

# src/modules/webhooks/tests/store.spec.ts

## Purpose
Unit tests for the `useWebhooksStore` Pinia store. The file mocks `orvalMutator` at the transport level and inspects the raw HTTP requests (URL, method, body, params) that each store action emits, following the same pattern as the users and products store tests. It additionally verifies a security invariant unique to webhooks: plaintext secrets (`secret`, `newSecret`) are returned to the caller but never persisted in the store's cached state.

## Key elements
- **`vi.mock('@/infrastructure/http', …)`** — Replaces `orvalMutator` with a function that routes each call through `parseOrvalFixture`. A bare subscription `DELETE` returns `undefined`; every other call (including secret-sub-resource DELETEs) returns the `SUBSCRIPTION` fixture.
- **`SUBSCRIPTION`** — A full subscription record used as the default mock response; includes `actions`, `secretIds`, `retiringSecrets`, and timestamps.
- **`lastRequest()` / `lastBody(schema)` / `lastParameters()`** — Helpers that extract the most recent `orvalMutator` call's config, validate its body against a Zod schema via `contractRequest`, or pull query params.
- **`respondWithItems(items)`** — Re-implements the mock to answer with a paginated envelope (`items` + `meta`).
- **`respondOnceWith(data)`** — One-shot mock for responses that carry fields (`secret`, `newSecret`) absent from the plain-record schema used by `parseOrvalFixture`.
- **`flush()`** — Chains `flushPromises()` then `nextTick()` to wait out fire-and-forget writes (e.g. `watchSubscription` backfill).
- **Test groups** — `createSubscription`, `createSecret`, `removeSecret`, `updateSubscription`, `enableSubscription`/`disableSubscription`, `deleteSubscription`, `replayDelivery`. Each asserts the correct route, method, and (where applicable) body shape.
- **`wireModulesIntoCore()`** — Called once at module scope to register stubs needed by the store's internal wiring before any test runs.

## Relationships
- **`src/modules/webhooks/store.ts`** — The module under test; the file imports `useWebhooksStore` and exercises every exported action.
- **`src/infrastructure/http/index.ts`** — Source of `orvalMutator`; the entire mock targets this import so no real HTTP occurs.
- **`tests/support/stub.ts`** — Provides `asStub`, a type-narrowing cast used by `lastParameters`.
- **`tests/support/unit/orval-fixture-schema.ts`** — Provides `parseOrvalFixture` (validates mock responses against Orval-generated schemas) and `contractRequest` (validates request bodies against Zod schemas).
- **`tests/support/unit/wire-modules.ts`** — Provides `wireModulesIntoCore`, called at module scope to set up the store's internal module wiring so it can be instantiated in isolation.

## Notes
- **Promise-returning `it` bodies.** Tests return their promise chain instead of using `async/await`. Vitest treats a returned rejected promise as a test failure, so `.then` assertions are equally binding. This is a project-wide convention documented in `docs/tools/unit-testing.md`.
- **DELETE response asymmetry.** The mock distinguishes a subscription-level `DELETE` (empty body) from a secret-level `DELETE` (full `SUBSCRIPTION` body) by checking whether the URL contains `/secrets/`. Forgetting this distinction will make `removeSecret` assertions fail.
- **Secret-leak assertions use `JSON.stringify`.** The "never parks the secret" tests serialise the entire `subscriptions` map to rule out the value hiding under any nested key, then add a targeted `not.toHaveProperty` check for clarity.
- **`wireModulesIntoCore()` must run before store instantiation.** Because it is called at the top of the module (not in `beforeEach`), it executes once per test-file load. If a future refactor moves it into a hook, ensure it still runs before the first `useWebhooksStore()` call.
