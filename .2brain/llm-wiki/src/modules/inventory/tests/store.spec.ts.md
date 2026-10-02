---
source: src/modules/inventory/tests/store.spec.ts
sha256: 8d6af921987fc1d7a611a6f13d9739e3ed77b9e3f09dd28f2acfb2bbabfe756b
generated_at: 2026-10-02T15:10:57.163353+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/store.spec.ts

## Purpose

Unit test suite for the inventory Pinia store (`useInventoryStore`). It mocks the HTTP transport at the `orvalMutator` seam, feeds canned API envelopes back through the real response-parsing pipeline, and asserts the store's data-shaping, query-passing, reload-order, and idempotency-key behaviour for every action (`fetchMovements`, `fetchLevels`, `receive`, `adjust`, `sweep`).

## Key elements

- **`MOVEMENT` / `LEVEL`** — Fixture rows shaped exactly as the API contract expects (one movement, one stock level). Used to build canned responses and to assert store state.
- **`responses`** — A `Record<string, unknown>` keyed by `"METHOD /path"` that acts as the mock transport's response table. Reset in `beforeEach`.
- **`vi.mock('@/infrastructure/http', …)`** — Replaces `orvalMutator` with a function that looks up `responses` by the incoming `method + url` and pipes the raw fixture through `parseOrvalFixture`, so schema validation still runs.
- **`requestedUrls()`** — Extracts the ordered list of URLs from `orvalMutator` mock calls; used to assert the write→reload sequence.
- **`keyOfFirstCall()`** — Pulls the `Idempotency-Key` header from the first mock-call's config; used to verify key freshness/reuse.
- **`beforeEach`** — Creates a fresh Pinia, clears all mocks, and seeds the default response table (movements, levels, receipts, adjustments).
- **`describe('fetchMovements')`** — Four tests: whole-list replacement, `productId` query passthrough, `totalItems` taken from `meta` (not array length), and last-query replay on bare re-fetch.
- **`describe('fetchLevels')`** — Single test: board is replaced with the API's answer.
- **`describe('receive')`** — Three tests: returns the API-reported level, asserts reload order (receipts → movements → levels), validates the request body via `contractRequest`, and checks that an optional operator note lands on the body.
- **`describe('the Idempotency-Key on a stock write')`** — Two tests (parameterised over `receive` and `adjust`): a fresh key is generated per successful write; a failed-then-retried write reuses the original key so the server can replay.
- **`describe('sweep')`** — Asserts the expired count is surfaced and that both views are reloaded in the canonical order.
- **`describe('adjust')`** — Asserts the signed `delta` is passed through in the body and that the same reload sequence as `receive` fires.

## Relationships

- **`src/infrastructure/http/index.ts`** — The module under mock. The test replaces `orvalMutator` so no real HTTP occurs; every assertion about "what was sent" inspects the mock call arguments that would have been handed to this function.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope (once per file load) to register test doubles into the app's module registry before any store is instantiated.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Supplies the three helpers used throughout: `orvalEnvelope` (wrap a payload in the API's standard envelope), `parseOrvalFixture` (validate a raw fixture against the generated schema at mock-execution time), and `contractRequest` (validate a request body against the generated schema and return the normalised object for assertion).

## Notes

- The reload order is asserted, not assumed: writes must hit **movements before levels**. The file comment frames this as "the ledger explains the board"—a level row that arrives before the movement history reads as a number with no explanation.
- `totalPages` in the `meta` fixture is intentionally included because the real API contract requires it; its presence was verified by `parseOrvalFixture` before the test could pass, making the fixture a living contract check.
- The idempotency-retry test works by deleting the response entry (setting it to `undefined`) *and* calling `mockRejectedValueOnce`, then restoring the entry before the retry. Both mechanisms are needed to simulate a network failure that the store treats as retryable.
- `wireModulesIntoCore()` runs at import time, not inside `beforeEach`, so it executes exactly once per test-file load.
