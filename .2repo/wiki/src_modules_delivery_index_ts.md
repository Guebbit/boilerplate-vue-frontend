# src/modules/delivery/index.ts

## Purpose

Public barrel for the delivery module. It exposes exactly two component re-exports and nothing else, serving as the single import point for anything outside the module that needs a shipping UI.

## Key elements

- **`ShippingSelector`** — re-export of `./components/ShippingSelector.vue` (default export).
- **`ShipmentPanel`** — re-export of `./components/ShipmentPanel.vue` (default export).

## Relationships

- **`src/modules/delivery/components/ShippingSelector.vue`** — the sole upstream dependency re-exported here as `ShippingSelector`.
- **`src/modules/delivery/components/ShipmentPanel.vue`** — the sole upstream dependency re-exported here as `ShipmentPanel`.

This file is the only public surface; external consumers import from the module root rather than reaching into `./components/…` directly.

## Notes

- The store is deliberately **not** re-exported. Both components manage their own data (selector fetches cart state, panel fetches order state), so no shared store is needed. Publishing one would create a second, broader API path that consumers would prefer over the component-level one.
- If you need to add a new public entry point, keep the barrel minimal and prefer a component or narrowly scoped utility over a full store export.
