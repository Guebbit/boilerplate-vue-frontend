# src/modules/orders/tests/cancel.spec.ts

## Purpose

Vitest spec for the `cancelOrder` action in the orders store. It mocks `orvalMutator` at the transport layer so assertions can inspect the **raw request body** (not just the URL) and verify that the store replaces the cached order record with the server-returned cancelled one.

## Key elements

- **`ORDER`** — Fixture object (`id: 'o1'`, `status: 'cancelled'`) returned by the mocked `POST /orders/o1/cancel` endpoint.
- **`sent`** (module-level array) — Records every `{ url, method, data }` the store sends, enabling body-level assertions.
- **`responses`** (module-level record) — Canned response bodies keyed by `"METHOD /path"`, consumed by the `orvalMutator` mock.
- **`vi.mock('@/infrastructure/http')`** — Replaces `orvalMutator` with a spy that pushes into `sent` and resolves the matching entry from `responses`.
- **`describe('cancelOrder')`** — Single test: after the call, `store.orders.o1.status` is `'cancelled'` (record replaced, not removed).
- **`describe('cancelOrder — the operator choosing what happens to the money')`** — Three tests pinning the request body:
  - No second argument → `data` is `undefined` (default customer cancel).
  - `cancelOrder('o1', false)` → body is `{ refund: false }`.
  - `cancelOrder('o1', true)` → body is `{ refund: true }`.

## Relationships

- Imports **`useOrdersStore`** from `@/modules/orders/store.ts` — the system under test.
- Mocks **`orvalMutator`** from `@/infrastructure/http` — the transport layer the store uses for its single customer-facing write.
- Cross-referenced in the file's docblock to `http-validate-responses.spec.ts`, which owns the contract-schema validation behavior that this spec does **not** exercise (validation is active in all modes except vitest).

## Notes

- The "no body" test is intentional: omitting the `refund` argument is the API's default (customer cancel). Asserting `data` is `undefined` guards against the store accidentally serializing `{ refund: undefined }` or an empty object.
- Transport-level mocking (replacing `orvalMutator`) is the shared pattern across store-flow specs; this file's distinguishing concern is body inspection, which the module docblock calls out explicitly.
- `beforeEach` resets `sent`, `responses`, and Pinia on every test; the mock is module-scoped and must not be re-registered per test.
