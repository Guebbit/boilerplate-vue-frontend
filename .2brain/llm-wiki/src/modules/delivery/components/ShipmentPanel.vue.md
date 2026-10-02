---
source: src/modules/delivery/components/ShipmentPanel.vue
sha256: ff75ad39aec48e2222e7b48a70527161575dfd5e3c2055fad00f78fa2cb9812c
generated_at: 2026-10-02T15:04:50.807783+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/ShipmentPanel.vue

## Purpose

Vue 3 single-file component that renders the shipping corner of an order page. It displays one of five states (not started, digital awaiting fulfilment, not yet shippable, ready to ship, in transit/arrived) and exposes the write controls (start, fulfill, ship, deliver) for that single order. Every gate is read from the order's own `actions` props supplied by the parent — the component never re-derives permission or status locally.

## Key elements

- **`defineProps`** — `orderId`, `shippingMethodId`, `canStart`, `canFulfill`, `canShip`, `canDeliver`, `override`. All boolean/array flags come straight from the server-rendered `actions` on the order object; the component trusts them verbatim.
- **`emit('moved')`** — fired after any successful state transition so the parent (typically `Order.vue`) can re-fetch the order.
- **`shipment` (computed)** — guards the shared store ref: only renders `rawShipment` when its `orderId` matches the current prop, discarding a stale response for a previously visited order (FA24).
- **`trackingRequired` (computed)** — looks up `shippingMethodId` in the store's `methods` list and reads `tracked`; defaults to `false` when methods are unloaded or the order carries no method.
- **`canOverrideShip` / `canOverrideDeliver` (computed)** — check whether the `override` array (server-provided `actions.override`) contains `shipped` / `delivered`, enabling the force controls.
- **`markStarted`, `markFulfilled`, `markShipped`, `markDelivered`** — one function per transition. Each clears the local error, calls the corresponding store action, resets local form state (`trackingCode`, `force`, `forceReason`), pushes a toast, and emits `'moved'`.
- **`useBlockingError`** — a single shared instance for both ship and deliver (they are never offered simultaneously). Surfaces 422/409/step-up failures inline via `InlineErrorAlert` rather than a toast.
- **`watch(orderId, …, { immediate: true })`** — refetches the shipment on mount and on navigation to a different order without remount.
- **`deliveryStore.fetchMethods()`** — called once at setup; the methods list is order-independent.

## Relationships

- **`src/modules/delivery/store.ts`** — imported as `useDeliveryStore`; provides the shared `shipment` ref, `methods` list, `loading` flag, and the four write actions (`start`, `fulfill`, `ship`, `deliver`). This component is the primary consumer of that store.

## Notes

- The component is **not** remounted when navigating between orders on the same route (see `Order.vue`'s `watchOrder`). The `shipment` computed guard and the `immediate` watch are the two mechanisms that prevent cross-order data bleed (FA24).
- `loading` is a **single shared flag** for both ship and deliver. This is safe because the template never offers both buttons at the same time.
- The tracking-code field is the **only** control that does not gate on `actions`; it reads `tracked` live from the methods list (a published fact, not a lifecycle rule).
- `force` + `forceReason` are cleared on every successful submit. The deliver button is disabled while `force` is checked and `forceReason` is empty.
- The `override` array is the single source of truth for which forced destinations are available; the server already excludes `cancelled` and any status the order has passed.
