# src/modules/delivery/components/ShipmentPanel.vue

## Purpose

Renders the shipping/tracking section of an order page. It displays the parcel's current status and tracking code, and—when the viewer is an admin and the parcel is still in transit—provides a "advance courier" button that simulates delivery progress (no background cron exists; an operator click is the timer).

## Key elements

- **`orderId` (prop, `string`)** — identifies which order's parcel this panel displays.
- **`emit('advanced')`** — fired after the courier has advanced and the shipment has been re-fetched; the parent should re-read the order.
- **`advanceCourier()`** — calls `deliveryStore.advance()`, fires a toast, re-fetches the shipment for `orderId`, then emits `advanced`. Returns a `Promise`.
- **`onMounted`** — triggers the initial `deliveryStore.fetchShipmentForOrder(orderId)` so the reactive `shipment` ref is populated before first render.
- **Template** — a `v-card` (hidden until `shipment` is truthy) with a status chip (color varies by `shipped`/`delivered`), the tracking code, and a gated `v-btn` for the courier action. All strings are i18n keys under the `shipment-panel.*` namespace.

## Relationships

- **`src/modules/delivery/store.ts`** — the primary data source. The component destructures `shipment` via `storeToRefs`, calls `deliveryStore.advance()` to tick the fake courier, and calls `deliveryStore.fetchShipmentForOrder(orderId)` both on mount and after advancing.
- **`src/modules/delivery/index.ts`** — barrel file for the delivery module; this component is expected to be re-exported from there for external consumers (e.g., the order page).

## Notes

- The courier button is **doubly gated**: `isAdmin` (session store) *and* `shipment.status === 'shipped'`. It disappears automatically once the status becomes `'delivered'` because the re-fetch updates the reactive `shipment`.
- The component does **not** call `fetchShipmentForOrder` reactively or on prop change; if the parent swaps `orderId` without remounting, the displayed shipment will be stale. The parent is expected to either remount or handle re-fetching.
- `advanceCourier` is sequential: `advance() → toast → fetch → emit`. A failure at any step propagates as a rejected promise (no internal `.catch`).
- Uses `@guebbit/vue-toolkit` for toast notifications, not a local utility.
