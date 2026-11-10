---
source: src/modules/orders/store.ts
sha256: 35bf0f18890dcb294089b3bc0d390b1dfc6a33b2efd39e9dabe836df39c4b0c1
signature: 9b1b0d4d585d6a0e3684793dfc0cc501a99915858b59942d57a48c4b77ae176f
generated_at: 2026-11-10T05:00:35.233813+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/store.ts

## Purpose

Pinia store (`useOrdersStore`) that owns all order-domain state: CRUD via the toolkit's `useStructureCrudApi`, plus hand-written actions for endpoints that don't fit record-shaped primitives (cancel, invoice, credit notes, timeline, notes, CSV export). It is the single source of truth the views and composables read from when displaying or mutating an order.

## Key elements

- **`OrdersFilters`** — exported type. Everything in `SearchOrdersRequest` except pagination/sort/id, with date fields widened to `YYYY-MM-DD` strings and `id` kept scalar for the UI.
- **`criteriaOf(filters)`** — internal mapper. Converts UI-shaped filters (calendar days, single id, CSV sort) into the API's shape (instants, id array, sort tokens). Shared by both `search:` and the CSV export so a download always matches the visible list.
- **`useOrdersStore`** — the Pinia store. Exposes toolkit primitives (`orders`, `ordersList`, `fetchOrders`, `watchSearchOrders`, `fetchOrder`, `updateOrder`, `deleteOrder`, `loading`, `pageCurrent`, `pageSize`, `pageTotal`, `pageItemList`, `selectedOrderId`, `currentOrder`, `fetchAny`, etc.) plus hand-written actions.
- **`hardDeleteOrder` / `restoreOrder`** — irreversible destroy and soft-delete undo, deliberately separate methods so the destructive path is never reached by a wrong boolean.
- **`cancelOrder`** — conditional cancel via `updateTarget`; uses `sendKeyed` idempotency; `refund` param is operator-only (ignored for customer-initiated cancels).
- **`fetchTimeline(orderId, page?)`** — paginated timeline read (newest-first). Outside `fetchAny` so it never flips the shared `loading` flag.
- **`addNote(orderId, text)` / `deleteNote(orderId, eventId)`** — staff timeline notes. `addNote` is wrapped in `sendKeyed` with a per-(order, text) idempotency key so a retry is idempotent but a deliberate second click creates a new note. Both outside `fetchAny`.
- **`listCreditNotes(orderId)`** — returns `CreditNoteSummary[]` (unwrapped `.items`). Background read, outside `fetchAny`.
- **`fetchInvoice` / `fetchCreditNote` / `fetchCreditNote`** — Blob/document fetches written directly against API functions (a Blob is not a record, so toolkit primitives don't apply).
- **`exportOrdersCsv`** — delegates to `exportOrders` using the same `criteriaOf` mapping as the search.
- **`overrideOrderStatus` / `correctOrderShippingAddress`** — status override and shipping-address correction endpoints.

## Relationships

- **`contracts/rest/index.ts`** (`@api`) — provides every HTTP function the store calls (`listOrders`, `searchOrders`, `getOrderById`, `cancelOrderById`, `getOrderInvoice`, `listOrderCreditNotes`, `getOrderTimeline`, `addOrderNote`, `deleteOrderNote`, `exportOrders`, `overrideOrderStatus`, `correctOrderShippingAddress`, etc.) and the `OrderSortItem` enum used by `sortTokensOf`.
- **`OrdersList.vue`** — primary consumer of `fetchOrders`, `watchSearchOrders`, `pageItemList`, `filters`, and `exportOrdersCsv`.
- **`OrderEdit.vue`** / **`OrderTarget.vue`** — consume `fetchOrder` / `watchOrder`, `updateOrder`, `deleteOrder`, `hardDeleteOrder`, `restoreOrder`, `cancelOrder`, and the shared `loading` state.
- **`OrderTimeline.vue`** — calls `fetchTimeline`, `addNote`, `deleteNote`.
- **`ShippingAddressForm.vue`** — calls `correctOrderShippingAddress`.
- **`use-order-documents.ts`** — calls `fetchInvoice`, `fetchCreditNotes`, `fetchCreditNote`.
- **Tests** (`store.spec.ts`, `cancel.spec.ts`, `override-status.spec.ts`, `order-timeline.spec.ts`, `shipping-address-form.spec.ts`, `order-view.spec.ts`, `order-edit-view.spec.ts`, `orders-list-view.spec.ts`) — each exercises a subset of the store's actions and state.

## Notes

- **Locale-scoped cache.** `dependsOn: () => [getCurrentLocale()]` means every cached order is only valid under the locale that fetched it (line-item titles/descriptions are translated). Switching locale reads a different cache scope; the toolkit drops the old one.
- **`maxRecords: 5000`.** Deliberately low (vs. the 100 000 default) because orders carry embedded line items and an admin paging full history would otherwise balloon memory. The cap drops the whole dictionary and repopulates with the incoming batch—safe here because all lists are server-paginated, but would break an infinite-scroll list.
- **Checkout is absent by design.** `POST /cart/checkout` belongs to `useCartStore`; this store only ever *fetches* the resulting order.
- **Background reads bypass `fetchAny`.** `fetchTimeline`, `addNote`, `deleteNote`, `listCreditNotes` intentionally do not set the store's shared `loading`, so a background poll or a note save never disables the page's primary action buttons.
- **Soft vs. hard delete are separate methods** (`deleteOrder` vs. `hardDeleteOrder`). `DELETE /orders/{id}` is one-way and idempotent; there is no "un-delete via DELETE" path—use `restoreOrder` (`POST /orders/{id}/restore`).
- **Cancel is conditional.** The server decides via `actions.cancel`; a race with a status change surfaces as a 409 that the store rethrows rather than silently overwriting.
