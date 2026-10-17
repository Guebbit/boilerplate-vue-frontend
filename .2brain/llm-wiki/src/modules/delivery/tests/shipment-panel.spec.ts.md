---
source: src/modules/delivery/tests/shipment-panel.spec.ts
sha256: 3c8dc52c9c6ad54d8c0a8e78ea2ee0c68b72cbab972815aca308f068666657a6
generated_at: 2026-10-17T00:49:47.663942+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/shipment-panel.spec.ts

## Purpose

Vitest spec that exercises `ShipmentPanel.vue` in isolation: which fulfillment-order cards render for a given order, the "arrives in N shipments" summary line, the order-level "Start fulfilment" action (including its error path), and the re-fetch that fires when `orderId` changes without a remount. Store fetch calls are spied so the test stays scoped to the panel's own decision logic, not the store's or the cards' internals.

## Key elements

- **`mountPanel(props)`** – Mounts `ShipmentPanel` with Vuetify + i18n plugins, returning the wrapper and the live store. Spies `fetchMethods` and `fetchFulfillmentForOrder` *before* mounting so the panel's setup-time calls hit the mocks.
- **`describe('what the panel lists')`** – Verifies the empty state, one card per fulfillment order with only its own shipments, and that records belonging to a *different* `orderId` are not rendered.
- **`describe('"arrives in N shipments"')`** – Confirms the count line is hidden for a single shipment and shown with the correct text for two or more.
- **`describe('the start-fulfilment door')`** – Checks the button's visibility (`canStart` prop), that clicking it calls `store.start(orderId)`, re-fetches, and emits `moved`; and that a rejected `start` renders the message into `[data-test=shipment-panel-error]` without emitting `moved`.
- **`describe('following the order')`** – Asserts that changing the `orderId` prop triggers a new `fetchFulfillmentForOrder` call without remounting.

## Relationships

- **`src/modules/delivery/components/ShipmentPanel.vue`** – The component under test; mounted directly via `@vue/test-utils`.
- **`src/modules/delivery/store.ts`** – `useDeliveryStore` is instantiated per test (fresh Pinia); its `fetchMethods`, `fetchFulfillmentForOrder`, and `start` methods are spied/mocked to keep the panel isolated.
- **`tests/support/unit/fixtures.ts`** – Supplies `aFulfillmentOrder` and `aShipment` factory functions for seeding store state.
- **`tests/support/unit/mounted-vm.ts`** – Provides `nextRenderTick`, the promise-based wait used after reactive state changes before asserting on the DOM.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register the delivery module in the app's plugin container before any test runs.

## Notes

- Spies are installed *before* `mount()` because the panel invokes the store's fetches during `setup`; spying afterwards would let the real calls race in.
- Selectors are all `data-test` attributes, not class names, so they stay stable across UI refactors.
- The spec deliberately does **not** test card-internal buttons (owned by `fulfillment-order-card.spec.ts`) or store internals (owned by `store.spec.ts`); the "arrives in N shipments" and "start fulfilment" cases are the boundary where the panel's own logic ends.
- The "refuses to show a record left over from another order" test encodes a real invariant: the store's arrays are shared across orders, so the panel must filter by the current `orderId` rather than trusting the store's list unconditionally.
