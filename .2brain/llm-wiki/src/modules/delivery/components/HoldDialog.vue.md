---
source: src/modules/delivery/components/HoldDialog.vue
sha256: 5d010eb9c5d3e75a34cac74c19e9d26578351b70143acae2a6bb122f016d3bca
generated_at: 2026-10-17T00:46:12.251929+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/HoldDialog.vue

## Purpose

A modal dialog that lets a staff member place a hold on a single fulfillment order. The user selects one of three staff-facing reasons (`incorrect_address`, `high_risk`, `other`) and optionally adds a free-text note, then submits. The dialog owns its submit call, reports success via a toast, and notifies the parent to re-fetch the order.

## Key elements

- **Props** — `fulfillmentOrder: FulfillmentOrder` (the order to hold).
- **`isOpen` (v-model, `boolean`)** — two-way open/close state driven by the parent.
- **`emit('held')`** — fired after a successful hold so the owning page can refresh.
- **`REASONS`** — hard-coded array excluding `awaiting_stock`, which is reserved for the stock-allocation system.
- **`reasonOptions` (computed)** — maps `REASONS` through i18n for the select dropdown.
- **`reason` / `note` (refs)** — form state; both reset to empty whenever `isOpen` becomes `true`.
- **`submit()`** — guards on `reason` being set, calls `deliveryStore.hold(orderId, { reason, note? })`, toasts on success, closes the dialog, and emits `'held'`; on failure, surfaces the error inline via `useBlockingError`.
- **`useFullscreenDialog`** — toggles `fullscreen` on the `v-dialog` for small viewports.
- **`useReturnFocus`** — restores focus to the trigger element on close.
- **`InlineErrorAlert`** — renders the blocking error message inside the card.

## Relationships

- **`src/modules/delivery/store.ts`** — imports `useDeliveryStore`; calls the `hold` action with the order id, reason, and optional note; reads the `loading` ref (via `storeToRefs`) to disable the submit button while any delivery request is in flight.
- **`src/modules/delivery/tests/hold-dialog.spec.ts`** — dedicated unit test suite for this component's form logic, submit flow, and error handling.
- **`src/modules/delivery/components/FulfillmentOrderCard.vue`** — sibling component in the same module; the card is the expected host that renders this dialog (not a direct import here).

## Notes

- `awaiting_stock` is deliberately absent from `REASONS`; the contract type `HoldFulfillmentOrderRequestReason` includes it, but this dialog only exposes the three staff-selectable values.
- The note is optional and is **omitted from the request payload entirely** when empty (spread conditional), rather than sent as an empty string.
- The submit button is disabled while `loading` is true *or* when no reason has been picked, so the `!reason` guard inside `submit()` is a secondary safety net.
- The dialog does not lock the body scroll or manage its own focus trap beyond what Vuetify's `v-dialog` and `useReturnFocus` provide.
