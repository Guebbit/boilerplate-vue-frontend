---
source: src/modules/delivery/components/ReportLostDialog.vue
sha256: 0926f1948e9425f344f872081e1c72ffea7837a2c9aa3317c7c282056fe6d7d2
signature: f9cc5a749733a3439a3ba140020933899f880a71103267ce40344588d73c0d2b
generated_at: 2026-11-10T04:15:34.568599+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/ReportLostDialog.vue

## Purpose

A modal dialog for staff to record that a parcel was lost or damaged in transit. It collects a reason (from the `ShipmentLostReason` enum), an optional internal note for colleagues, and an optional buyer-facing message that gets mailed. On success it closes itself, fires a toast, and emits `reported` so the parent page can refresh.

## Key elements

- **`isOpen` (`defineModel<boolean>`)** — two-way binding controlling whether the dialog is open.
- **`reason`** — the selected `ShipmentLostReason`; starts as `undefined` (no default is pre-selected).
- **`note`** — free-text for internal staff only (max 1 000 chars).
- **`message`** — buyer-facing text that is mailed and shown on the buyer's order (max 500 chars).
- **`reasonOptions`** — computed list translating each enum value via i18n keys `report-lost-dialog.reason-{value}`.
- **`submit()`** — calls `deliveryStore.markLost(shipmentId, payload)`, then toasts success, closes the dialog, and emits `'reported'`. Failures are caught into the local `useBlockingError` state and rendered by `<InlineErrorAlert>`.
- **`watch(isOpen, …)`** — resets `reason`, `note`, `message`, and clears any previous error each time the dialog opens.
- **`props.shipment`** — the `Shipment` object whose loss is being recorded; its `id` and `number` are used in the API call and title respectively.

## Relationships

- **`src/modules/delivery/store.ts`** — imports `useDeliveryStore` and calls its `markLost` action; also reads the store-level `loading` flag (via `storeToRefs`) to disable the submit button while any delivery call is in flight.
- **`src/modules/delivery/tests/report-lost-dialog.spec.ts`** — unit-test suite exercising this component's form logic, submission, and error paths.

## Notes

- `reason` is intentionally left `undefined` until the staff member selects one; the submit button is disabled until it has a value.
- `note` and `message` are sent only when non-empty after trimming — the payload spreads them conditionally.
- The `loading` flag is store-global (shared across all delivery mutations), not scoped to this dialog.
- The dialog renders its own error inline via `useBlockingError`; it does **not** rely on the global logger or notification store for failure feedback.
