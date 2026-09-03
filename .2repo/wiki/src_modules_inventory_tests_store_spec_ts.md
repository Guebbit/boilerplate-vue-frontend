# src/modules/inventory/tests/store.spec.ts

## Purpose

Vitest spec for the Pinia inventory store. It exercises every public action (`fetchMovements`, `fetchLevels`, `receive`, `sweep`, `adjust`) against a mocked HTTP transport, pinning down the store's read-replace semantics, write-then-reload ordering, and payload shapes so regressions in those contracts are caught at the store boundary.

## Key elements

- **`vi.mock('@/infrastructure/http')`** — replaces `orvalMutator` with a `vi.fn` that resolves canned responses keyed by `"METHOD /path"`, reset in `beforeEach`.
- **`requestedUrls()`** — helper that extracts the `url` from each mock call, used to assert the exact reload sequence after a write.
- **`beforeEach`** — creates a fresh Pinia instance, clears mocks, and seeds the `responses` map with default canned payloads for GETs and POSTs.
- **`describe('fetchMovements')`** — four cases: whole-list replace, `productId` query-param passthrough, `meta.totalItems` → `movementsTotal`, and last-query replay when called with no args (the reload-after-write path).
- **`describe('fetchLevels')`** — asserts whole-list replacement of `store.levels`.
- **`describe('receive')`** — verifies the returned level object, the three-call sequence (`/receipts` → `/movements` → `/levels`), body shape (`productId` + `quantity`), and optional `note` field.
- **`describe('sweep')`** — asserts the `expired` count is returned and the same movements-before-levels reload order.
- **`describe('adjust')`** — confirms the signed `delta` is sent in the body and that the reload sequence mirrors `receive`.

## Relationships

- **`src/infrastructure/http/index.ts`** — the sole external dependency under test. The file imports `orvalMutator` (the generated API client's transport) and mocks it at module level; every assertion about "what hits the wire" goes through this mock. No other infrastructure modules are touched.

## Notes

- Reload order is **asserted, not assumed**: after any write the store must call `GET /inventory/movements` before `GET /inventory/levels`. The module-level comment frames this as "the ledger explains the board." If you reorder the store's internals, `requestedUrls()` equality checks in `receive`, `sweep`, and `adjust` will fail.
- The "last-query replay" test (`fetchMovements` with no args after a parameterised call) is the contract that makes reload-after-write correct: the store must remember the previous query and re-issue it rather than fetching an unfiltered default.
- `meta.totalItems` is the source of truth for `movementsTotal`, deliberately tested to be *independent* of `items.length` (41 ≠ 1 in the pagination case).
- Canned response keys are `METHOD /path` strings; if a new endpoint is added to the store, a matching key must appear in `beforeEach`'s `responses` map or the mock will resolve `undefined`.
