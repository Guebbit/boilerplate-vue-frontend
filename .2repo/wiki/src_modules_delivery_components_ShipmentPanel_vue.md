# src/modules/delivery/components/ShipmentPanel.vue

## Purpose

A small Vue 3 SFC that renders the shipping status (tracking code + status chip) for a single order. When the viewer is an admin and the parcel is still in transit, it also exposes a button that manually advances the courier, serving as the repo's substitute for a backend timer.

## Key elements

- **`orderId` prop** – identifies which order's parcel the panel displays.
- **`advanced` emit** – fired after the courier is ticked and the shipment re-fetched, signalling the parent to re-read the order.
- **`advanceCourier()`** – calls `deliveryStore.advance()`, pushes a notification, re-fetches the shipment for the current order, then emits `advanced`.
- **`onMounted` hook** – fetches the shipment via `deliveryStore.fetchShipmentForOrder(orderId)` so the card appears once data is ready.
- **Template** – a `v-card` rendered only when `shipment` is truthy; shows a status `v-chip` (green for `delivered`, blue otherwise), the tracking code, and a conditionally-visible advance button (`isAdmin && status === 'shipped'`).

## Relationships

- **`src/modules/delivery/store.ts`** – the component imports `useDeliveryStore`, reads its reactive `shipment` ref via `storeToRefs`, and calls `advance()` and `fetchShipmentForOrder(orderId)`.
- **`src/modules/delivery/index.ts`** – the module barrel that places this component in the delivery module's public surface (import/export chain).

## Notes

- The advance button is a manual "tick the clock" mechanism; there is no cron or background job. The button is intentionally the only way to move a shipment from `shipped` → `delivered`.
- The card is invisible until `shipment` is populated, so a brief blank state is expected on first mount.
- All user-facing strings go through `t('shipment-panel.*')` keys; the status chip key is built dynamically as `shipment-panel.status-${shipment.status}`.
- `data-test` attributes (`shipment-panel`, `shipment-status`, `shipment-tracking`, `courier-advance`) are the e2e hooks—preserve them when refactoring.
- Notifications are pushed via `@guebbit/vue-toolkit`'s `useNotificationsStore`, not a local event.
