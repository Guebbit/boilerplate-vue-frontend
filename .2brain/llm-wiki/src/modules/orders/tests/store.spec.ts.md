---
source: src/modules/orders/tests/store.spec.ts
sha256: 23b69393f4a264276d9fa2c9256a80373986216ec3ebd655c5990c2a4d109068
generated_at: 2026-10-02T15:24:24.205886+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/store.spec.ts

## Purpose

Unit tests for the `useOrdersStore` Pinia store. The `@api` client module is mocked at the module level so every store action is exercised against canned, schema-validated responses. The file intentionally excludes checkout (`POST /cart/checkout`), which belongs to `useCartStore` and is covered in `src/modules/cart/tests/store.spec.ts`.

## Key elements

- **`RESPONSES`** — Object of pre-validated JSON fixtures (listed, searched, fetched, created, updated, deleted, hardDeleted, restored), each produced through `contractResponse` against the corresponding generated response schema.
- **`INVOICE`** — A minimal `Blob` (`application/pdf`) standing in for binary invoice/credit-note payloads that carry no JSON envelope.
- **`CREDIT_NOTES`** — Fixture array matching the credit-note list envelope shape.
- **`EMPTY_PAGE`** — Paginated-envelope fixture with a full `meta` object (page, pageSize, totalItems, totalPages) to mirror the real `PaginationMeta` shape.
- **`vi.mock('@api', …)`** — Module-level mock that maps every `@api` function (listOrders, searchOrders, getOrderById, createOrder, updateOrderById, deleteOrderById, hardDeleteOrderById, restoreOrderById, getOrderInvoice, listOrderCreditNotes, getOrderCreditNote) to `vi.fn()` resolving the appropriate fixture, plus the `OrderSortItem` enum.
- **`describe` blocks** — One per store action: `fetchOrders`, `fetchPaginationOrders`, `createOrder`, `updateOrder`, `deleteOrder`, `restoreOrder`, `hardDeleteOrder`, `fetchInvoice`, `fetchCreditNotes`, `fetchCreditNote`, `fetchOrder`, `watchSearchOrders`. Each asserts call arguments and store-state side-effects.
- **Cache-behavior tests** (`fetchOrder` block) — Verify that the order id is used as the cache key (second call served from cache) and that `{ forced: true }` bypasses it.

## Relationships

- **`tests/support/unit/fixtures.ts`** — Supplies the `anOrder` factory used to build the `ORDER` fixture with realistic totals.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — Supplies `contractResponse` and `contractRequest`, which validate each fixture against the operation's generated Orval schema at construction time (responses) and at assertion time (requests), so the test fails if the fixture drifts from the API contract.

## Notes

- The `RESPONSES` object validates every JSON fixture against its schema **once, at module load**, so a schema/fixture mismatch surfaces as an import-time error rather than a test failure.
- `fetchInvoice` and `fetchCreditNote` are the only two actions whose payload is a raw `Blob`; they deliberately skip `contractResponse` because there is no JSON envelope to validate.
- `hardDeleteOrder` and `deleteOrder` are tested for **mutual exclusion** (each asserts the other's client was *not* called) to guard against a shared code path accidentally routing one to the other's endpoint.
- `fetchPaginationOrders` is implemented on top of `searchOrders` (a paged read with no filters), not on `listOrders`; tests assert the `searchOrders` call accordingly.
- `EMPTY_PAGE.meta` includes `totalPages` because `store.ts` reads `meta.totalPages` for `pageTotal`; omitting it would make the fixture unrepresentative of a real response.
