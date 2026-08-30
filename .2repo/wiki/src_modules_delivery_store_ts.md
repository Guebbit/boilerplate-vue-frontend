# src/modules/delivery/store.ts

## Purpose

Pinia setup store (`useDeliveryStore`) that holds the delivery domain state — the shop's available shipping methods and the current order's shipment — and wraps each backend call in the toolkit's shared loading tracker. It exists so Vue components can read/write delivery state reactively without duplicating fetch or loading logic.

## Key elements

- **`useDeliveryStore`** — The store itself, registered as `'delivery'`. Exposes `methods`, `shipment`, `loading`, and four actions.
- **`methods`** (`ref<ShippingMethod[]>`) — Flat list of shipping options (price + optional `freeAbove` threshold). Populated by `fetchMethods`.
- **`shipment`** (`ref<Shipment | undefined>`) — The parcel tied to the current order; `undefined` means nothing has shipped yet.
- **`fetchMethods`** — Calls `listShippingMethods()` and stores the result in `methods`.
- **`effectivePrice(method, itemsTotal)`** — Pure display helper: returns `0` when `itemsTotal >= method.freeAbove`, otherwise `method.price`. Explicitly *not* authoritative; the server re-prices at checkout.
- **`fetchShipmentForOrder(orderId)`** — Calls `getShipmentByOrder(orderId)`. A 404 is treated as a valid answer ("nothing shipped yet") and sets `shipment` to `undefined`; any other error is re-thrown.
- **`advance`** — Calls `advanceCourier()`; described in comments as the fake-courier admin tick that marks all shipped parcels as arrived.
- **`fetchAny` / `loading`** — Provided by `useStructureRestApi`; every action runs through `fetchAny` so the global `loading` flag (from `useCoreStore`) reflects in-flight requests.

## Relationships

- **`ShipmentPanel.vue`** — Consumes `shipment`, `fetchShipmentForOrder`, and likely `advance` to display and act on an order's parcel.
- **`ShippingSelector.vue`** — Consumes `methods`, `fetchMethods`, and `effectivePrice` to render selectable shipping options with their display cost.

## Notes

- The store is intentionally **non-authoritative on price**: `effectivePrice` mirrors the backend's free-above rule for UI display only. The checkout re-prices server-side against the actual cart lines; never treat this store's numbers as a committed charge.
- `fetchShipmentForOrder` swallows **only** 404s. Any other HTTP error propagates, preventing a transient failure from being misread as "no shipment."
- All API calls route through `fetchAny`, which toggles the shared `loading` ref. Guarding against concurrent calls or managing per-request loaders is the caller's responsibility.
- The `advance` action is an admin/testing affordance (fake courier); it is not part of the normal buyer flow.
