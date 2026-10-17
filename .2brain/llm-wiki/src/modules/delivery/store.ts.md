---
source: src/modules/delivery/store.ts
sha256: bf6500c1bc9a89aa0c4793ff979c1aa73acd68adc0036e835e18198e0e3fbf8a
generated_at: 2026-10-17T00:48:30.074261+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/store.ts

## Purpose

Pinia setup store (`useDeliveryStore`) that owns all delivery and fulfillment state for a session: shipping methods, an order's fulfillment orders and shipments, and the preorder board. Every action wraps a single API call through the toolkit's `fetchAny`, giving the whole module one shared `loading` flag. It exists so that the delivery UI components and the preorder-board pages can read and mutate fulfillment state without managing HTTP calls or loading state themselves.

## Key elements

- **`useDeliveryStore`** — the exported Pinia store (id `'delivery'`), defined with a setup function.
- **State refs** — `methods`, `shipToCountries`, `fulfillmentOrders`, `shipments`, `preorderBoard`, `preorderBoardTotal`, `preorderSummaries`.
- **`fetchAny` / `loading`** — from `useStructureRestApi`; every public action funnels through `fetchAny` so the single `loading` ref reflects in-flight work.
- **`fetchMethods`** — loads shipping methods and, in parallel, `loadShop()` to populate `shipToCountries`.
- **`fetchFulfillmentForOrder(orderId)`** — reads an order's fulfillment orders + shipments (empty until paid).
- **`readFulfillment(orderId)`** — internal helper; performs the GET without its own loading wrap. Every write action calls it after the mutation.
- **`start(orderId)`** — transitions `paid → processing`.
- **`ship(fulfillmentOrderId, input?)`** — cuts a physical shipment; returns the new shipment after re-read.
- **`fulfill(fulfillmentOrderId)`** — fulfils a digital order (born-delivered).
- **`hold` / `release`** — staff hold and lift a fulfillment order.
- **`confirmWait(fulfillmentOrderId)`** — buyer consents to keep waiting on a late preorder.
- **`deliver(shipmentId, forced?, reason?)`** — records arrival; `forced` path for `override:Order`.
- **`editTracking(shipmentId, trackingCode)`** — corrects a tracking code while still `shipped`.
- **`fetchPreorderBoard(query?)`** — one page of the preorder fulfillment-order list (always sends `preorder: true`).
- **`fetchPreorderSummaries()`** — recursively paginates `summarizePreorderFulfillmentOrders` until the last page (up to `MAX_PAGE_SIZE = 100` per page).

## Relationships

- **Consumed by** all delivery UI components (`ShippingSelector`, `ShipmentPanel`, `ShipmentRow`, `FulfillmentOrderCard`, `HoldDialog`, `ShipItemsDialog`, `PreorderFulfillmentTable`): they read the store's refs for rendering and call its actions for mutations.
- **`use-preorder-summaries.ts`** — composable that builds on `fetchPreorderSummaries` / `preorderSummaries` for the board's first tab.
- **`@/infrastructure/query-client.ts`** — the shared `queryClient` instance passed into `useStructureRestApi` for cache/query coordination.
- **`@/infrastructure/shop.ts`** — `loadShop` and `shipToCountries` are read inside `fetchMethods` to seed the country list.
- **`@api`** — all REST calls (`listShippingMethods`, `shipFulfillmentOrder`, `holdFulfillmentOrder`, `deliverShipment`, `listPreorderFulfillmentOrders`, `summarizePreorderFulfillmentOrders`, etc.) are imported from this barrel.
- **Test specs** (`*.spec.ts`) exercise the store's actions and state transitions through the component that renders them.

## Notes

- **Write-then-reread pattern:** every mutating action (`ship`, `fulfill`, `hold`, `release`, `deliver`, `editTracking`, `confirmWait`) calls `readFulfillment` *after* the API resolves, so the local `fulfillmentOrders`/`shipments` refs always reflect the server's post-mutation state. The returned value is the API response, not the local ref.
- **`readFulfillment` is intentionally not wrapped in `fetchAny`** — it runs inside the write's own `fetchAny` block, so it inherits that call's loading scope rather than adding a second.
- **`fetchMethods` runs `loadShop()` in parallel** with `listShippingMethods`; only the methods response is stored, but `shipToCountries` is populated from the shop. The two promises are coupled via `Promise.all`.
- **`fetchPreorderSummaries` paginates recursively** with `MAX_PAGE_SIZE = 100`. If the server ever reports a very large `totalPages`, this will issue many sequential requests before resolving.
- **`shipToCountries` is informational only** — it narrows the address form's dropdown; the real enforcement is server-side at checkout.
- **Empty ≠ error:** `fetchFulfillmentForOrder` returns empty arrays (not a 404) when the order is not yet paid. Consumers should treat `fulfillmentOrders.length === 0` as "not yet fulfilled," not as a fetch failure.
