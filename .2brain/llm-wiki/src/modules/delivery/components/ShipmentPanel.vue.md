---
source: src/modules/delivery/components/ShipmentPanel.vue
sha256: 3473be235412b87b50d660d8ed739b4992e10394d3449dac8b10f5a5263ac751
signature: 3473be235412b87b50d660d8ed739b4992e10394d3449dac8b10f5a5263ac751
generated_at: 2026-11-10T04:16:30.620136+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/ShipmentPanel.vue

## Purpose

The shipping section of the order page. It renders the order's fulfillment orders as `FulfillmentOrderCard` children, shows a shipment-count summary, and exposes the single order-level control — "Mark in progress" — which is gated by the order's own `canStart` flag. All per-record lifecycle actions live on the cards themselves; this panel never derives its own lifecycle rules.

## Key elements

- **Props** — `orderId` (required), `canStart` (gates the start button), `shippingAddress` (passed to cards for context).
- **Emits** — `moved`: fired after any state change so the parent page can reload the order.
- **`fulfillmentOrders` / `shipments` (computed)** — filter the shared store lists down to the current `orderId`, guarding against stale responses when the component is reused across orders.
- **`arrivesInCount` (computed)** — calls `shipmentCount()` from the domain; returns the count only when ≥ 2 (singular or zero yields `0`, hiding the line).
- **`shipmentsOf(fulfillmentOrderId)`** — returns the shipments belonging to one fulfillment order, in server order.
- **`markStarted()`** — clears inline error → `deliveryStore.process(orderId)` → `fetchFulfillmentForOrder` → toast + `emit('moved')`. Failures land in the inline `panelError`, not a toast.
- **`useBlockingError`** — provides `panelError` / `reportPanelError` / `clearPanelError` for the in-card error alert.
- **`useAmbientError`** — handles toasts for background fetch failures (no form to host an inline error).
- **Watch on `orderId` (immediate)** — fetches fulfillment on mount and on every `orderId` change without requiring a remount.

## Relationships

- **`src/modules/delivery/components/FulfillmentOrderCard.vue`** — rendered once per fulfillment order; receives the order record, its shipments, and the shipping address; its `@moved` event is re-emitted upward.
- **`src/modules/delivery/store.ts` (`useDeliveryStore`)** — source of `fulfillmentOrders`, `shipments`, and `loading` via `storeToRefs`; panel calls `process()` and `fetchFulfillmentForOrder()`.
- **`src/modules/delivery/domain/index.ts`** — provides `shipmentCount`, used for the "arrives in N" summary.
- **`src/modules/delivery/domain/ship-lines.ts`** — upstream implementation of the domain helpers re-exported through the domain barrel.
- **`src/modules/delivery/index.ts`** — module barrel that re-exports this component for page-level imports.
- **`src/modules/delivery/tests/shipment-panel.spec.ts`** — unit/integration tests for this component.

## Notes

- The store lists are **shared across all orders**. The computed filters exist because `OrderTarget.vue` reuses this panel on route-param changes without a remount; a slow response for a previous order must not leak into the current view.
- Dual `<script>` blocks: the first (plain `<script>`) declares the component `name` for `<KeepAlive>` and devtools; `<script setup>` cannot do this itself.
- `arrivesInCount` deliberately suppresses the count when it is 0 or 1 — the UI only calls out multi-shipment orders.
- The "Mark in progress" error is shown **inline** (`InlineErrorAlert`) rather than as a toast, because it is the one synchronous, user-facing action on this panel. Background fetch failures, by contrast, go to the ambient toast via `useAmbientError`.
