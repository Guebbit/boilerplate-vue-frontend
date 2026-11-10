---
source: src/modules/orders/tests/cancel.spec.ts
sha256: 42846548cd6c32d1b4033a3e46da505f1912f8c0dd4c1f4a2aedb5c26f4cf90a
signature: 5f2b08917fd7223973a32fd5c1c4f31a8539d26c4640b3d7fb518c20c3fda62d
generated_at: 2026-11-10T05:00:59.830932+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/cancel.spec.ts

## Purpose

Vitest spec for the `cancelOrder` store action. It mocks `orvalMutator` at the transport layer so assertions can inspect the raw HTTP request body (not just the URL) and confirm that the canceled record **replaces** the cached one. This is the only customer-write in the orders store, and the spec pins both the cache-replacement invariant and the three refund-choice variants of the request payload.

## Key elements

- **`ORDER`** – Fixture built via `anOrder({ status: 'canceled' })`; the canned response the mock returns for `POST /orders/o1/cancel`.
- **`sent`** – Accumulates every `{ url, method, data? }` config the store passes to the mocked `orvalMutator`, enabling body-level assertions.
- **`responses`** – Map of `"METHOD url"` → response body, read by the mock to produce the next reply.
- **`vi.mock('@/infrastructure/http', …)`** – Replaces `orvalMutator` with a function that records the request, then resolves a fixture parsed through `parseOrvalFixture`.
- **`describe('cancelOrder')`** – Single test: after `store.cancelOrder('o1')`, the cached record's status is `'canceled'` (record replaced, not appended).
- **`describe('cancelOrder — the operator choosing what happens to the money')`** – Three tests asserting the request body:
  - `cancelOrder('o1')` → body asserted via `toBeUndefined()` (no body = API default customer cancel).
  - `cancelOrder('o1', false)` → body equals `{ refund: false }` (validated via `contractRequest(schemas.CancelOrderByIdBody, …)`).
  - `cancelOrder('o1', true)` → body equals `{ refund: true }`.
- **`beforeEach`** – Resets Pinia, clears mocks, and re-initialises `sent` / `responses`.

## Relationships

- **`src/modules/orders/store.ts`** – Provides `useOrdersStore`; the spec exercises its `cancelOrder` action and reads the resulting cache to assert the replacement.
- **`tests/support/unit/fixtures.ts`** – Supplies `anOrder`, the factory used to build the `ORDER` fixture.
- **`tests/support/unit/orval-fixture-schema.ts`** – Supplies `parseOrvalFixture` (response parsing/validation inside the mock) and `contractRequest` (asserts a request body conforms to a named API schema before comparing).
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` wires the store module into the Pinia instance so `useOrdersStore()` resolves correctly outside an app.

## Notes

- The spec deliberately does **not** test response-schema validation; that behaviour is owned by `http-validate-responses.spec.ts`. A payload-less `200` would never reach the store in production because `orvalMutator` validates every response in all modes except vitest.
- `contractRequest` is used instead of a plain `toEqual` to guarantee the asserted shape matches the generated API contract, not just a hand-written literal.
- The `sent` array is cleared in `beforeEach`; each test must index `sent[0]` because exactly one request is expected per action call.
