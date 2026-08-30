# src/modules/orders/tests/cancel.spec.ts

## Purpose

Vitest spec that verifies the `cancelOrder` action in the orders store. It mocks `orvalMutator` at the transport layer so tests can assert both the resulting store state (cached record replaced with the cancelled one) and the exact request body sent for each refund-intent variant.

## Key elements

- **`ORDER`** — fixture object representing the server's cancelled-order response (id `o1`, status `cancelled`).
- **`responses`** — mutable map keyed by `"METHOD url"`, read by the `orvalMutator` mock to return canned bodies.
- **`sent`** — array of `{ url, method, data }` entries capturing every request the store made, enabling body-level assertions.
- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a spy that records the call config and resolves from `responses`.
- **`beforeEach`** — resets Pinia, clears mocks, reinitializes `sent` and `responses` with the single `POST /orders/o1/cancel` entry.
- **`describe('cancelOrder')`** — asserts the store's cached order is replaced with the cancelled record after the action resolves.
- **`describe('cancelOrder — the operator choosing what happens to the money')`** — three cases pinning the request body: `undefined` (no arg), `{ refund: false }`, and `{ refund: true }`.

## Relationships

No graph neighbors are listed. The file's visible interactions are:

- **Imports** `useOrdersStore` from `@/modules/orders/store.ts` (the unit under test).
- **Mocks** `@/infrastructure/http` (`orvalMutator`) to intercept the transport layer.
- The module doc-block references `http-validate-responses.spec.ts` as the owner of `orvalMutator`'s schema-validation behaviour (out of scope here).

## Notes

- The spec deliberately does **not** test response-schema validation; that is delegated to `http-validate-responses.spec.ts`. A payload-less 200 never reaches the store in production because `orvalMutator` validates in all modes except Vitest.
- The "no body" case is intentional: an absent body signals the API's default (customer cancel, no refund). Sending `{ refund: true }` unconditionally would overstate the caller's intent.
- Tests use `return store.cancelOrder(...).then(...)` rather than `await`/`async`, matching the store's Promise-based return contract.
