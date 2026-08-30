# src/modules/delivery/index.ts

## Purpose

Public barrel for the delivery module. It exposes exactly two Vue components (`ShippingSelector`, `ShipmentPanel`) and nothing else. The module's store is deliberately *not* re-exported here so that consumers must interact with shipping data through the components' own internal fetch logic rather than reaching for a shared store API.

## Key elements

- **`ShippingSelector`** — re-export of `./components/ShippingSelector.vue`. Fetches cart state internally to present shipping options.
- **`ShipmentPanel`** — re-export of `./components/ShipmentPanel.vue`. Fetches order state internally to display parcel details.

No additional exports, no side effects, no store re-exports.

## Relationships

- **`src/modules/delivery/components/ShipmentPanel.vue`** — the component this file re-exports as `ShipmentPanel`.
- **`src/modules/delivery/components/ShippingSelector.vue`** — the component this file re-exports as `ShippingSelector`.

Both are the sole targets of this barrel; the file adds no logic beyond the named re-exports.

## Notes

- The store that backs these components lives elsewhere in the module tree and is intentionally kept out of this barrel. The file's doc comment states the rationale: exposing the store would create a "wider" path to shipping-rate data, and the wider path tends to win in practice. If you need the store directly, import it from its own location—not from here.
- Consumers should treat this file as the *only* public entry point for the delivery module; reach for these two components rather than importing sub-paths directly.
