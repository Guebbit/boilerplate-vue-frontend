---
source: src/modules/delivery/store.ts
sha256: 254660df3b7bc3b7ae32f5d0c6cbfc0de818f4fcc7d8630714ce4cf4a483b599
signature: 4e2336ce5a55c9f6c5ed9c791643e8be0318cff05921fb4f54c335db0350b3f2
generated_at: 2026-11-10T04:18:38.439692+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/store.ts

## Purpose

Pinia setup store that owns all delivery-side state (shipping methods, fulfillment orders, shipments, preorder board) and every write action the admin UI can perform against a paid order (ship, fulfill, hold, release, report-lost, deliver, update). It centralises idempotency-key management for the two destructive writes (ship, fulfill) and always re-reads the order's fulfillment lists after a successful mutation so components render current data.

## Key elements

- **`useDeliveryStore`** – the single exported store (`defineStore('delivery', …)`). All state and actions live inside its setup function.
- **`loading` / `fetchAny`** – provided by `useStructureRestApi`; every action is wrapped in `fetchAny` so the store exposes one shared `loading` flag.
- **State refs** – `methods`, `shipToCountries`, `fulfillmentOrders`, `shipments`, `preorderBoard`, `preorderBoardTotal`, `preorderSummaries`.
- **`shipIdempotencyKeys` / `fulfillIdempotencyKeys`** – per-fulfillment-order `Idempotency-Key` keepers; a retry after a network failure replays the same key so the API returns the original response instead of double-charging stock.
- **`fetchPreorderBoard(query?)`** – loads one filtered/paginated page of preorder fulfillment orders into `preorderBoard` + `preorderBoardTotal`.
- **`fetchPreorderSummaries()`** – paginates `summarizePreorderFulfillmentOrders` (using `MAX_PAGE_SIZE` from the generated schema) until all pages are collected into `preorderSummaries`.
- **`fetchMethods()`** – loads shipping methods *and* the shop's `shipToCountries` in one call; methods are informational only (server re-prices at checkout).
- **`readFulfillment(orderId)`** – internal helper: parallel `listOrderFulfillmentOrders` + `listOrderShipments`, replaces both refs atomically. No loading flag of its own.
- **`fetchFulfillmentForOrder(orderId)`** – public wrapper around `readFulfillment` that adds the `fetchAny` loading flag.
- **`process(orderId)`** – transitions `paid → processing`; does not store the order here (caller re-reads).
- **`ship(fulfillmentOrderId, input?)`** – cuts a physical shipment; idempotent; re-reads fulfillment on success; calls `failKeyedWrite` on error.
- **`fulfill(fulfillmentOrderId)`** – fulfils a digital order; same idempotency + re-read pattern.
- **`hold(fulfillmentOrderId, input)`** – places a staff hold; re-reads on success.
- **`release(fulfillmentOrderId)`** – lifts a staff hold (server rejects `awaiting_stock`).
- **`failKeyedWrite(keeper, fulfillmentOrderId, error)`** – settles the key, attempts a best-effort re-read (skipped when the error is a kept key / lost connection), then rethrows.
- **`MAX_PAGE_SIZE`** – imported from `@api/schemas` (generated constant); used to fetch the full preorder summary list.

## Relationships

- **Consumed by** every delivery Vue component (`FulfillmentOrderCard`, `HoldDialog`, `PreorderFulfillmentTable`, `ReportLostDialog`, `ShipItemsDialog`, `ShipmentPanel`, `ShipmentRow`, `ShippingSelector`) and the `use-preorder-summaries` composable, which read the store's refs and call its actions.
- **Depends on** `@api` (REST endpoint functions), `@guebbit/vue-toolkit` (`useStructureRestApi`), `@/infrastructure/query-client` (TanStack Query cache), `@/infrastructure/http/idempotency` (key generation), `@/infrastructure/utils/errors` (`keepsIdempotencyKey`), and `@/modules/shop` (`loadShop`, `shipToCountries`).
- **Tested by** the spec files under `src/modules/delivery/tests/` which mock the `@api` layer and assert store state transitions.

## Notes

- Shipping methods in this store are **quoted, not authoritative**: the checkout endpoint re-prices the chosen method server-side against the actual basket. UI numbers here inform the choice but never commit it.
- `shipToCountries` is read from the shop module (`NODE_SHIP_TO_COUNTRIES` env) purely to narrow the address-form country picker; the real enforcement is server-side at checkout.
- `readFulfillment` deliberately has **no** loading flag of its own; it is always called inside another action's `fetchAny` wrapper or as a fire-and-forget re-read after a write.
- `failKeyedWrite` skips the re-read when `keepsIdempotencyKey(error)` is true (lost connection / in-flight 409) because nothing new arrived on the server. The re-read is also best-effort: its own rejection is swallowed so the original error always propagates.
- `MAX_PAGE_SIZE` is imported from the generated OpenAPI schema (`summarizePreorderFulfillmentOrdersQueryPageSizeMax`) rather than hardcoded, keeping it in sync with the API contract.
- The store name is `'delivery'`; components should use `useDeliveryStore()` rather than accessing a global instance.
