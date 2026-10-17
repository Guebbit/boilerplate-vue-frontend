---
source: src/modules/orders/tests/store.spec.ts
sha256: 1120cc53f837ee4f3675e8ea13956ec92e9e19813fa2fbe0622761dec0ed24ed
generated_at: 2026-10-17T01:19:23.330694+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/store.spec.ts

## Purpose

Unit tests for the orders Pinia store (`useOrdersStore`). The entire `@api` client module is mocked so every store action is exercised against canned, schema-validated responses. This file also covers the binary-Blob paths (`fetchInvoice`, `fetchCreditNote`) and the CSV export flow that have no JSON envelope to validate. Checkout is deliberately absent here — it belongs to `useCartStore` and is covered in `src/modules/cart/tests/store.spec.ts`.

## Key elements

- **`ORDER`** — fixture order built via the `anOrder` factory (1 item, qty 2, total 19.98).
- **`INVOICE`** — a minimal PDF `Blob` standing in for the binary invoice/credit-note download.
- **`TIMELINE` / `CREDIT_NOTES`** — fixture arrays shaped exactly as their endpoint envelopes carry them.
- **`EMPTY_PAGE`** — a paginated envelope whose `meta` includes `totalPages`, required because `store.ts` reads that field.
- **`RESPONSES`** — every JSON response, each proven once against its generated Orval schema via `contractResponse`. The Blob responses are excluded (no schema applies).
- **`vi.mock('@api', …)`** — replaces all 14 API functions with `vi.fn()`s returning the fixtures above; also stubs the `OrderSortItem` enum the store consults to drop unsupported sort keys.
- **`describe('useOrdersStore', …)`** — one sub-suite per action:
  - `fetchOrders` — unwraps `items` from the list envelope.
  - `fetchPaginationOrders` — asserts the `searchOrders` call shape and pass-through of page/size.
  - `createOrder` — forwards payload unchanged; validates body against `CreateOrderBody` schema.
  - `updateOrder` — id in path, `email` in body (the only remaining field).
  - `deleteOrder` / `hardDeleteOrder` — each calls its own client; cross-asserts the other was *not* called.
  - `restoreOrder` — calls the dedicated restore endpoint and caches the result.
  - `fetchInvoice` — returns the Blob as-is.
  - `fetchCreditNotes` / `fetchCreditNote` — unwraps list / returns single note Blob.
  - `fetchTimeline` — unwraps envelope to entries.
  - `exportOrdersCsv` — verifies query shape (filters present, `page` absent, date as ISO instant), `responseType: 'text'`, CSV `File` output, and that a 422 refusal passes through untouched.

## Relationships

- **`src/modules/orders/store.ts`** — the system under test; every `it` block calls a `useOrdersStore()` action.
- **`tests/support/unit/fixtures.ts`** — supplies the `anOrder` factory used to build `ORDER`.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** — supplies `contractResponse` (validates a fixture against a generated response schema) and `contractRequest` (validates a request body against a generated request schema). Both are used inline in assertions.
- **`tests/support/stub.ts`** — supplies `asStub`, imported for helper coercion in the test scope.

## Notes

- **Blob paths skip schema validation.** `getOrderInvoice` and `getOrderCreditNote` return raw `Blob`s; `contractResponse` is never applied to them because there is no JSON envelope to check.
- **`EMPTY_PAGE.meta` must carry `totalPages`.** Omitting it would silently break `fetchPaginationOrders`, which maps `meta.totalPages` to the store's `pageTotal`.
- **`hardDeleteOrder` is a separate method, not a flag.** The tests explicitly assert that calling one does *not* invoke the other's client function, guarding against a boolean-mixup regression.
- **`OrderSortItem` is mocked as a plain object.** The store reads this enum to filter out sort keys the API would reject; the mock mirrors the real enum shape.
- **`exportOrdersCsv` date assertion is zone-agnostic.** Only the presence of a `'T'` separator is checked, since the browser's local zone makes the exact instant non-deterministic in CI.
