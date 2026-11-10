---
source: src/modules/delivery/components/HoldDialog.vue
sha256: 90c47e3f5cf59d034bc9a1041523a036ad5c1776ab9345c2a1d8b44852c59f21
signature: 4325c2767fb048fd3096b9070f0f8b4916efc37099c2dbfb149a4ede9740bfeb
generated_at: 2026-11-10T04:14:50.130700+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/HoldDialog.vue

## Purpose

A staff-facing dialog that records a hold on a single fulfillment order. The operator selects one of the allowed `HoldFulfillmentOrderRequestReason` values (never `awaiting_stock`), optionally writes an internal note for other staff, and optionally writes a buyer-facing message. On success it toasts, closes itself, and emits `held` so the parent page can refresh the order.

## Key elements

- **Props** — `fulfillmentOrder: FulfillmentOrder`; the order being held.
- **`isOpen` (defineModel)** — two-way binding controlling dialog visibility; the parent toggles it.
- **`reason`** — `ref<HoldFulfillmentOrderRequestReason | undefined>`; required before submit. No default is chosen ("a default would be a claim nobody made").
- **`note`** — optional internal staff text (max 1 000 chars).
- **`message`** — optional text the **buyer** receives; kept separate from the internal note.
- **`reasonOptions`** — computed; maps the enum values to i18n-labeled select items.
- **`submit()`** — calls the store's hold action with the selected reason and any trimmed note/message. On success: toast, close, emit `held`. On failure: surfaces an inline error via `useBlockingError` without closing the dialog.
- **`useBlockingError`** — provides `holdError` / `reportHoldError` / `clearHoldError` for in-place error display.
- **`watch(isOpen)`** — resets the form (reason, note, message, error) every time the dialog re-opens.

## Relationships

- **`src/modules/delivery/store.ts`** — imports `useDeliveryStore`; invokes the store's hold action with the order id and a `{ reason, note?, message? }` payload, and reads the store's `loading` ref to disable the submit button while any delivery call is in flight.
- **`src/modules/delivery/tests/hold-dialog.spec.ts`** — dedicated unit-test suite covering this component's rendering, submit flow, error path, and emit contract.

## Notes

- The `awaiting_stock` reason is intentionally excluded from the staff-facing enum; it is set only by the stock-allocation pipeline.
- The submit button is disabled when `loading` (any delivery call in flight) **or** when `reason` is still `undefined`.
- `note` and `message` are only included in the request payload when non-empty after `.trim()`, keeping the API body minimal.
- The dialog renders inside a shared `DialogShell` organism with `DIALOG_MAX_WIDTH.form`; the title is localized with the order number.
- All user-facing strings go through `useI18n` under the `hold-dialog.*` namespace.
