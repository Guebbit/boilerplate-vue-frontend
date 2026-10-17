---
source: src/modules/delivery/components/ShipmentPanel.vue
sha256: 51ea47c107a3f341b785780175a1548b9700daad25c21e045a8a895a2b16953f
generated_at: 2026-10-17T00:47:01.413213+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/ShipmentPanel.vue

## Purpose

Renders the shipping section of the order detail page: lists the order's fulfillment orders (each delegated to `FulfillmentOrderCard`), shows a "arrives in N shipments" summary, and exposes the single order-level "Start fulfilment" action. All per-record actions (ship, arrive, override) live on the cards themselves; this panel never derives lifecycle rules.

## Key elements

- **Named component block (`export default { name: 'ShipmentPanel' }`)** — provides a stable name for devtools and `<KeepAlive>`, since `<script setup>` cannot declare one.
- **Props** — `orderId` (required), `shippingMethodId` (lookup key for tracking-code requirement), `canStart` (order's own `actions.start` flag), `override` (allowed target statuses for forced ship/arrival).
- **`fulfillmentOrders` / `shipments` (computed)** — filter the shared store lists by `orderId` to guard against stale data from a previous order's in-flight response.
- **`arrivesInCount` (computed)** — calls `shipmentCount` from the domain layer; returns 0 unless the count is ≥ 2 (so the summary line hides for 0 or 1 shipments).
- **`trackingRequired` (computed)** — resolves the order's frozen shipping method against the methods list; defaults to `false` when methods are still loading.
- **`markStarted()`** — calls `deliveryStore.start()`, then re-fetches fulfillment, fires a toast, emits `moved`; on failure routes the error into `useBlockingError` for an in-place alert.
- **`watch(orderId, …, { immediate: true })`** — fetches fulfillment on mount and on every `orderId` change (the component is reused across orders without a remount).
- **`useBlockingError()`** — provides `panelError` / `reportPanelError` / `clearPanelError` for the inline `InlineErrorAlert`.

## Relationships

- **`../store.ts` (`useDeliveryStore`)** — primary data source. Reads `fulfillmentOrders`, `shipments`, `methods`, `loading` via `storeToRefs`; calls `start()`, `fetchFulfillmentForOrder()`, `fetchMethods()`.
- **`./FulfillmentOrderCard.vue`** — rendered per fulfillment order; receives the record, its shipments, `trackingRequired`, `override`, and re-emits `moved`.
- **`../domain/ship-lines.ts`** — imports `shipmentCount` for the summary count.
- **`../index.ts`** — module barrel that re-exports this component to consumers outside the delivery module.
- **`../tests/shipment-panel.spec.ts`** — unit/integration tests for this component.

## Notes

- The store's lists are **shared across all open orders**. Because `Order.vue` reuses this component via a route-param watch (no remount), every computed that reads a store list must filter by the current `orderId`; a slow response for a previous order will otherwise render as the current one.
- `fetchMethods()` is called unconditionally at setup because the methods list is order-independent and only needs to load once per session.
- The dual `<script>` + `<script setup>` block is intentional and required by Vue to attach a component name; it is not a code smell.
- `arrivesInCount` intentionally hides the line for a single shipment (returns 0), so the template's `v-if="arrivesInCount"` acts as both a truthiness and a "≥ 2" gate.
