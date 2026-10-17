---
source: src/modules/delivery/tests/fulfillment-order-card.spec.ts
sha256: b97cff4244845ae127e1fb0922f4376b4178938562509663c102370d6a081dc4
generated_at: 2026-10-17T00:48:44.076601+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/fulfillment-order-card.spec.ts

## Purpose

Vitest spec for `FulfillmentOrderCard.vue`. Mounts the real card (Vuetify + i18n, `VDialog` stubbed inline) and verifies three things: the human-readable label and line details shown per status, that every staff action button is driven by the record's own `actions` object (with the single "forced-ship" override exception), and that a successful or failed action is reported to the parent page via the `moved` event. Dialog *forms* are deliberately out of scope (see `ship-items-dialog.spec.ts`).

## Key elements

- **`mountCard(fulfillmentOrder, extra?)`** – Local helper. Creates a fresh Pinia store, mounts `FulfillmentOrderCard` with Vuetify/i18n plugins and a `VDialog` stub that renders its slot inline, returns `{ wrapper, store }`. Accepts optional `shipments` and `override` (an `OrderStatus[]`) as extra props.
- **`beforeEach`** – Installs a fresh Pinia instance and loads the `'en'` locale.
- **`describe('what a card shows')`** – Parameterized status→label assertions, awaiting-stock hold copy, hold note + revised date, per-line shipped/cancelled counts, digital-group badge, and shipment row listing.
- **`describe('the buttons come from actions')`** – Verifies buttons appear only when the corresponding `actions` flag is true; covers the forced-ship override (allowed only for open, non-digital, non-held orders); asserts store methods (`fulfill`, `release`, `confirmWait`) are called with the order id and that the `moved` event fires on success but not on rejection (error text shown in-place instead).
- **`describe('a late preorder')`** – Covers the `consent` lifecycle (`awaiting`, `confirmed`, `expired`), the `confirmWait` action flow, and the "Waiting for the buyer" staff-facing state with no button.

## Relationships

- **`FulfillmentOrderCard.vue`** – The component under test; imported and mounted directly.
- **`src/modules/delivery/store.ts`** – `useDeliveryStore` is used to obtain the store instance; its async methods (`fulfill`, `release`, `confirmWait`) are spied via `vi.spyOn` and mocked to resolve or reject.
- **`tests/support/unit/fixtures.ts`** – Supplies `aFulfillmentOrder` and `aShipment` factory functions used throughout every test case.
- **`tests/support/unit/mounted-vm.ts`** – Provides `nextRenderTick`, awaited after each `trigger('click')` to let Vue flush async renders before assertions.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called once at module scope (outside any `describe`) to register required module wiring before any test runs.

## Notes

- `wireModulesIntoCore()` runs at **module load time**, not inside `beforeEach`; removing or reordering it will break every test in the file.
- The `VDialog` stub (`<div><slot /></div>`) means dialog content is always in the DOM. Tests that check for a "missing" button must assert on the button's own `data-test` attribute, not on the dialog wrapper.
- The "forced ship" (`override` prop) is the **only** path that produces the ship button independent of `actions.ship`; it is gated to open, physical, non-held orders.
- On a rejected store call the component shows an inline error (`[data-test=fulfillment-order-error]`) and does **not** emit `moved`; tests assert `emitted('moved')` is `undefined`.
- Element queries use `data-test` attributes exclusively; there are no selectors by class or tag.
- The file is truncated in the snapshot; a trailing test about "who cancelled what" is implied but not fully visible.
