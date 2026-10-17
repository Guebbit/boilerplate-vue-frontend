---
source: src/modules/orders/tests/cancel.spec.ts
sha256: 0854bde7590ccd9b177b2ab45b229ebfe80c9f4618606f5d663a367471a0fb47
generated_at: 2026-10-17T01:16:48.674027+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/cancel.spec.ts

## Purpose

Vitest spec for the orders store's `cancelOrder` action. It mocks `orvalMutator` at the transport boundary so assertions can inspect the **raw request body** (not just the URL) and verify that the server response replaces the cached order record.

## Key elements

- **`vi.mock('@/infrastructure/http', …)`** — replaces `orvalMutator` with a function that records every outgoing `{ url, method, data }` into `sent` and returns a canned response from `responses`, parsed through `parseOrvalFixture` for schema fidelity.
- **`sent`** (module-level array) — accumulator of all request configs; tests assert on `sent[0].data` to verify the exact body payload.
- **`responses`** (module-level record) — canned response bodies keyed by `"METHOD /path"`; reset in `beforeEach`.
- **`ORDER`** — fixture order (via `anOrder`) with `status: 'cancelled'`, wrapped in `orvalEnvelope` as the 200 response.
- **`describe('cancelOrder')`** — single test: after the call, `store.orders.o1.status` is `'cancelled'` (replaced, not merged).
- **`describe('cancelOrder — the operator choosing what happens to the money')`** — three tests pinning the request body: no body when `refund` is omitted, `{ refund: false }` when explicitly false, `{ refund: true }` when true. Assertions use `contractRequest(schemas.CancelOrderByIdBody, …)` for schema-aware comparison.

## Relationships

- **`src/modules/orders/store.ts`** — the SUT; imports `useOrdersStore` and exercises its `cancelOrder(id, refund?)` action.
- **`tests/support/unit/fixtures.ts`** — provides the `anOrder` factory used to build the `ORDER` fixture.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` called once at module top-level to bootstrap the DI container for the store.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `orvalEnvelope` (wrap fixture in the orval response shape), `parseOrvalFixture` (validate/normalise the canned body inside the mock), and `contractRequest` (assert a request body conforms to an API schema while returning it for equality checks).

## Notes

- **No schema-validation coverage here.** Response validation against the orval contract is explicitly delegated to `http-validate-responses.spec.ts`; this spec assumes validation passes and focuses solely on body shape and cache replacement.
- **`sent` and `responses` are module-level, not per-test.** They are re-initialised in `beforeEach` after `vi.clearAllMocks()`, so tests must not rely on values set in a prior `it` block.
- **Body-assertion convention:** when the store omits a parameter the test expects `data` to be `undefined` (not `{}`), reflecting that an absent body is the API's "default cancel" signal.
- The `vi.mock` factory closes over the module-level `sent`/`responses` bindings via the `let` declarations; this works because Vitest hoists the mock but the factory body executes lazily on each call.
