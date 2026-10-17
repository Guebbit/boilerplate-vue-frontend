---
source: src/modules/delivery/components/ShipmentRow.vue
sha256: 662374bdfaaeac5c784b60382e86fa742bbfab27c63e8c9ac4c5db960e24fc00
generated_at: 2026-10-17T00:47:19.561261+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/ShipmentRow.vue

## Purpose

Renders a single shipment row inside a `FulfillmentOrderCard`: the shipment's number, status chip, tracking code, line items, and dates. It also provides the two staff controls that the shipment's own `actions` object authorizes — inline tracking-code correction and mark-as-delivered (with an optional forced-arrival override for `override:Order` holders). Which controls appear is driven entirely by `shipment.actions` and the `canForce` prop; no rules are re-derived locally.

## Key elements

- **`props`** — `shipment: Shipment` (data + `actions` flags) and `canForce?: boolean` (granted by the parent when `Order.actions.override` includes `delivered`).
- **`emit('moved')`** — fires after any successful write so the owning page can re-fetch the order.
- **`trackingDraft`** — local `ref` seeded from `shipment.trackingCode`; the editable tracking field.
- **`force` / `forceReason`** — toggle and required reason text for a forced (carrier-less) arrival.
- **`offerForce`** *(computed)* — `true` when status is `shipped` **and** `canForce` is set.
- **`offerDeliver`** *(computed)* — `true` when `actions.deliver` is present **or** the force toggle is active.
- **`trackingChanged`** *(computed)* — non-empty draft that differs from the current code; gates the save button.
- **`run(move, successKey)`** — shared write helper: clears row error → calls the store mutation → toasts on success, resets force state, emits `moved` → catches and reports the error in-place.
- **`saveTracking()`** — `run(deliveryStore.editTracking(id, code), …)`.
- **`markDelivered()`** — `run(deliveryStore.deliver(id, force?, reason?), …)`.
- **`useBlockingError()`** — per-row error message + `report` / `clear` helpers; rendered via `<InlineErrorAlert>`.

## Relationships

- **`src/modules/delivery/store.ts`** — imports `useDeliveryStore`; calls `editTracking` and `deliver` mutations; reads the shared `loading` flag via `storeToRefs` to disable buttons and prevent double-submits.
- **`src/modules/delivery/components/FulfillmentOrderCard.vue`** — parent container; owns the `canForce` prop (derived from the order's `actions.override`) and listens for the `moved` event to refresh the order.
- **`src/modules/delivery/tests/shipment-row.spec.ts`** — unit tests for this component's rendering, form gating, and error handling.

## Notes

- **Action-source contract.** Which controls are rendered is dictated by `shipment.actions` (`editTracking`, `deliver`) plus the `canForce` prop. This component intentionally does *not* re-derive permissions from status or role — the server or parent decides.
- **Force-arrival is opt-in and gated.** The force checkbox only appears when `offerForce` is true. When active, the deliver button stays disabled until `forceReason` is non-empty. On success both `force` and `forceReason` reset.
- **Row-scoped error state.** `useBlockingError` keeps a lost-race or server refusal message next to *this* shipment row only; it never surfaces as a global toast.
- **`loading` disables both buttons.** The shared store flag prevents two rapid writes (tracking save + deliver) from racing.
- **`data-test` attributes** on every interactive element and data region exist for the spec file; do not remove or rename them without updating `shipment-row.spec.ts`.
