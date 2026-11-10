---
source: src/modules/delivery/tests/store.spec.ts
sha256: 2ca4f25d41567c4dfe4393d339dfc4476354327a2c43519c72417da952b00564
signature: 2a8d607741270dd292be022d3daccc3e83edfc4a602f53eef1febc4f282c4588
generated_at: 2026-11-10T04:21:26.529719+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/store.spec.ts

## Purpose

Vitest suite for the delivery store (`useDeliveryStore`). It mocks the HTTP transport (`orvalMutator`) and verifies that every store method sends the correct request body, mirrors API responses into state, propagates failures as rejections, and maintains state consistency when partial reads fail.

## Key elements

- **`METHODS`** — two fixture delivery-method objects (standard/express) used as the `GET /delivery/methods` payload.
- **`responses`** — a `Record<string, unknown>` map keyed `"METHOD /url"`; reset in `beforeEach` to the full set of mocked endpoints.
- **`rejectWith(status, message)`** — builds the API rejection envelope via `aProblem`; the only shape the store catches.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a function that looks up `responses` by key, rejects on `Error` instances, and parses successful fixtures through `parseOrvalFixture`.
- **`sentBody(method, url)`** — inspects the mocked transport's call history to extract the request `data` for contract assertions.
- **`keyOfFirstCall()`** — extracts the `Idempotency-Key` header from the first mock call.
- **`describe('fetchMethods')`** — verifies method list mirroring, no query params, and ship-to-country population.
- **`describe('fetchFulfillmentForOrder')`** — verifies dual-list mirroring, empty-list-as-answer, failure propagation, and that a failed second read does not overwrite the first list.
- **`describe('process')`** — confirms the store calls the order-process endpoint without mutating its own state.
- **`describe('ship')`** — asserts exact body shape via `contractRequest(schemas.ShipFulfillmentOrderBody, …)` and post-write re-read.
- **`describe('the Idempotency-Key on a shipment write')`** — parametric test over `ship`/`fulfill`: fresh key after success, same key on network-level retry, fresh key after server refusal (which also triggers a state re-read).
- **`describe('fulfill')`** — digital-fulfillment path; asserts delivered status and re-read.

## Relationships

- **`src/modules/delivery/store.ts`** — the unit under test; `useDeliveryStore` is imported and exercised in every `describe` block.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to inject DI so the store's dependencies resolve without a running app.
- **`tests/support/unit/orval-fixture-schema.ts`** — provides `parseOrvalFixture` (used inside the mock to shape responses) and `contractRequest` (used in assertions to validate outgoing bodies against `@api/schemas`).
- **`tests/support/unit/fixtures.ts`** — provides entity factories (`aFulfillmentOrder`, `aShipment`, `aShop`, `aProblem`, etc.) used to build both fixture responses and rejection envelopes.

## Notes

- `wireModulesIntoCore()` runs **once** at module load, before any test; it must not be re-called per test or DI state will leak.
- The mock keys are case-sensitive `"METHOD /url"` strings; adding a new endpoint to the store without a matching key in `responses` will produce a 404 rejection, which is the intended fail-fast behavior.
- `sentBody` and `keyOfFirstCall` use a **dynamic** `import('@/infrastructure/http')` inside the test to retrieve the mock after `vi.mockClear()` calls—statically importing the mock at the top would give a stale reference.
- The "empty list is an answer, not an error" invariant is deliberately tested in `fetchFulfillmentForOrder` to guard against a future refactor that might treat `items: []` as a 404.
- Idempotency-Key semantics tested here: **network failure** (client-side, request never reached the server) → reuse key; **server refusal** (5xx) → key is spent, a fresh one is generated on the next attempt, and the store re-reads order state so the UI reflects server truth.
