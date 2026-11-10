---
source: src/modules/orders/tests/store.spec.ts
sha256: 1d2000bc1fd3a8d7d5c3b9bcb0b467e6692cff191e55030e8897d5ac4226beaa
signature: 8712fa1b615f7d85f1c769c73a7e0a60ce614120ba4f70e35948551c081663b0
generated_at: 2026-11-10T05:05:30.537484+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/store.spec.ts

## Purpose

Unit tests for the `useOrdersStore` Pinia store. The `@api` client module is mocked in its entirety so that each store action can be exercised against canned responses without network I/O. The suite covers every store action except `checkout`, which lives in the cart store and is covered in `src/modules/cart/tests/store.spec.ts`.

## Key elements

- **`vi.mock('@api', …)`** — replaces all 14 API functions (`listOrders`, `searchOrders`, `getOrderById`, `updateOrderById`, `deleteOrderById`, `hardDeleteOrderById`, `restoreOrderById`, `getOrderInvoice`, `listOrderCreditNotes`, `getOrderCreditNote`, `getOrderTimeline`, `addOrderNote`, `deleteOrderNote`, `exportOrders`) with `vi.fn()` stubs that resolve to fixture values. Also mocks the `OrderSortItem` enum used by the store to drop sorts the API would refuse.
- **`RESPONSES`** — object of pre-built JSON responses, each validated once at module load via `contractResponse` against its generated Orval schema (e.g. `schemas.ListOrdersResponse`).
- **`ORDER` / `INVOICE` / `TIMELINE_PAGE` / `CREDIT_NOTES` / `EMPTY_PAGE`** — top-level fixture constants; `ORDER` is built with the `anOrder` factory, `INVOICE` is a raw PDF `Blob`.
- **`describe('useOrdersStore')`** — top-level suite; `beforeEach` resets Pinia and clears all mocks. Sub-describes mirror each store action:
  - `fetchOrders` — asserts `ordersList` is populated from the envelope `items`.
  - `fetchPaginationOrders` — asserts default `{ page: 1, pageSize: 10 }` and pass-through of explicit values.
  - `updateOrder` — asserts path param + body split; validates body against `UpdateOrderByIdBody` schema.
  - `deleteOrder` / `hardDeleteOrder` / `restoreOrder` — verify each calls its own client function and **not** the others; `restoreOrder` also checks the cache write.
  - `fetchInvoice` / `fetchCreditNote` — assert the binary `Blob` passes through untouched (no envelope unwrap).
  - `fetchCreditNotes` / `fetchTimeline` — assert envelope unwrapping and default/explicit page params.
  - `addNote` — asserts body shape, `Idempotency-Key` header presence, and returned entry.
  - `deleteNote` — asserts `(orderId, noteId)` passthrough.
  - `exportOrdersCsv` — asserts query criteria are forwarded without paging fields and a `File` is returned.

## Relationships

- **`src/modules/orders/store.ts`** — the module under test; this spec imports `useOrdersStore` and exercises every exported action.
- **`tests/support/unit/fixtures.ts`** — provides the `anOrder` factory used to build the `ORDER` fixture with realistic field values.
- **`tests/support/unit/orval-fixture-schema.ts`** — provides `contractResponse` (and `contractRequest`) which validate fixture objects against the generated Orval response/request schemas at test time, catching drift between fixtures and API contracts.

## Notes

- `fetchInvoice` and `fetchCreditNote` return raw `Blob`/`File` objects, not JSON envelopes, so they have no `contractResponse` validation and are asserted with `toBe` (identity) rather than `toEqual`.
- `EMPTY_PAGE.meta` includes `totalPages: 1` because `store.ts` reads `meta.totalPages` to set `pageTotal`; omitting it would not represent a real response.
- Soft delete (`deleteOrder`) and hard delete (`hardDeleteOrder`) are intentionally separate store methods rather than a boolean flag; the tests assert mutual exclusion (each calls only its own client function) to guard against accidental destructive calls.
- Checkout (`POST /cart/checkout`) is explicitly out of scope here; see `src/modules/cart/tests/store.spec.ts`.
