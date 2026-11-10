---
source: src/modules/delivery/tests/shipment-panel.spec.ts
sha256: 6fefa1442e3226e6dec5c38766d70c6c90e604d21c334b30e6c24e890e82fb49
signature: 5ec5d8af1a43de692fc9f2403a930f2d2198aa77aa73a31a378b492d052223bf
generated_at: 2026-11-10T04:20:31.036380+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/shipment-panel.spec.ts

## Purpose

Unit-test spec for `ShipmentPanel.vue`, the order-page shipping panel. Verifies the panel's own rendering logic (which cards appear, the "arrives in N shipments" line, the order-level "start fulfillment" action, and re-fetching on `orderId` change) while the delivery store's network calls are stubbed. Explicitly out of scope: card-internal buttons (covered by `fulfillment-order-card.spec.ts`) and store-level logic (covered by `store.spec.ts`).

## Key elements

- **`mountPanel(props)`** — local helper that creates a fresh Pinia store, spies on `fetchFulfillmentForOrder` (mock-resolved), mounts `ShipmentPanel` with Vuetify + i18n plugins, and returns `{ wrapper, store }`.
- **`beforeEach`** — resets to a fresh Pinia instance and loads the `en` locale.
- **`describe("what the panel lists")`** — empty-state message, one card per fulfillment order with only its own shipments, and rejection of records belonging to a different `orderId`.
- **`describe('"arrives in N shipments"')`** — the count line appears only when ≥ 2 fulfillment orders exist.
- **`describe("the start-fulfillment door")`** — the "Mark in progress" button is gated by `canStart`; clicking it calls `store.process`, triggers a re-fetch, and emits `moved`; a rejected `process` surfaces an inline error without emitting `moved`.
- **`describe("following the order")`** — changing `orderId` via `setProps` causes a re-fetch without remount.

## Relationships

- **`ShipmentPanel.vue`** — the SUT; mounted directly via `@vue/test-utils`.
- **`store.ts`** (`useDeliveryStore`) — the Pinia store whose state (`fulfillmentOrders`, `shipments`) is mutated to drive assertions, and whose `fetchFulfillmentForOrder` / `process` methods are spied.
- **`fixtures.ts`** — supplies `aFulfillmentOrder` and `aShipment` factory functions for realistic test data.
- **`mounted-vm.ts`** — supplies `nextRenderTick`, a promise that resolves after Vue's render flush so assertions see updated DOM.
- **`wire-modules.ts`** — supplies `wireModulesIntoCore`, called once at module level to register i18n/module shims before any test runs.

## Notes

- Spies are set **before** `mount()`; the panel invokes store methods during `setup`, so the spy must already be in place.
- The store's lists are shared across orders within a single panel instance — the "refuses to show a record left over from another order" test exists to guard against stale-data bleed when `orderId` changes.
- Tests that need a reactive update call `nextRenderTick(wrapper)` (a microtask/flush helper) rather than `await` or `setTimeout`; the returned promise chains with `.then`.
- The `canStart` prop on `mountPanel` maps to the `actions.process` flag the panel reads to decide whether to show the start-fulfillment button.
