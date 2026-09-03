# src/modules/delivery/store.ts

## Purpose

Pinia setup store for the delivery domain. It holds the shop's shipping-method catalogue and the current order's shipment record, and exposes actions that wrap the corresponding `@api` calls through the toolkit's shared `fetchAny` helper so every request participates in the app-wide loading flag.

## Key elements

- **`useDeliveryStore`** — the `defineStore('delivery', …)` setup-function export; the sole public entry point.
- **`methods`** (`ref<ShippingMethod[]>`) — the list of shipping options the checkout can offer.
- **`shipment`** (`ref<Shipment | undefined>`) — the parcel tied to the current order; `undefined` until fetched or when nothing has shipped.
- **`fetchMethods()`** — calls `listShippingMethods()` and stores the result in `methods`.
- **`effectivePrice(method, itemsTotal)`** — pure display helper that applies the `freeAbove` threshold to return `0` or `method.price`. Does **not** commit a price.
- **`fetchShipmentForOrder(orderId)`** — calls `getShipmentByOrder(orderId)`; a 404 resolves to `undefined` (no parcel yet), any other error re-throws.
- **`advance()`** — admin/dev action that calls `advanceCourier()` to tick the mock courier forward; resolves with the count of parcels advanced.
- **`loading`** — reactive flag from `useStructureRestApi`, exposed for consumers to drive spinners.

## Relationships

- **`ShipmentPanel.vue`** — reads `shipment` / `loading` and calls `fetchShipmentForOrder` to display (or clear) the parcel state for a given order.
- **`ShippingSelector.vue`** — reads `methods` / `loading`, calls `fetchMethods` to populate the option list, and uses `effectivePrice` to render the per-method cost next to each choice.

## Notes

- `effectivePrice` is a **display-only** duplicate of the server's free-above rule. The checkout re-prices server-side against the actual cart lines; the store's number never settles the charge.
- The 404 swallow in `fetchShipmentForOrder` is deliberate: a 404 means "no shipment exists yet." Any other status is a genuine failure and must propagate — swallowing it would falsely report "nothing shipped" for a parcel in transit.
- `advance()` is a development/admin shortcut for the mock courier; it is not part of the customer-facing flow.
- The store relies on `@guebbit/vue-toolkit` (`useCoreStore`, `useStructureRestApi`) for loading-flag threading and `fetchAny` wrapping — all API calls here go through that single path.
