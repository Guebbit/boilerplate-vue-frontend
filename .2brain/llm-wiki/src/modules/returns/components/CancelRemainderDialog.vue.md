---
source: src/modules/returns/components/CancelRemainderDialog.vue
sha256: e953655edb5d6f4b4bd26b28bce2f53edb75b315998089e0438650fa935e0ce2
generated_at: 2026-10-17T01:36:38.692140+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/components/CancelRemainderDialog.vue

## Purpose

A confirmation dialog that cancels the unshipped remainder of a single fulfillment order. It displays the server-computed refund amount (from `GET /returns/options`) and, on confirm, fires a `POST /returns` cancellation. Two callers reuse it: the buyer (as part of a withdrawal, no note) and staff (with a free-text note and a step-up key handled by the HTTP layer).

## Key elements

- **Props** — `orderId`, `currency` (ISO-4217), `option` (`CancellableFulfillmentOrder` with lines, refundAmount, shippingRefund, fulfillmentOrderId), and `mode` (`'buyer'` | `'staff'`).
- **`isOpen`** — `defineModel<boolean>` two-way binding controlling dialog visibility.
- **`note`** — reactive ref, staff-only; cleared each time the dialog opens via a `watch` on `isOpen`.
- **`refundText` / `shippingText`** — computed; format `option.refundAmount` and `option.shippingRefund` with `formatCurrency` for display.
- **`submit()`** — calls the returns store's `openReturn` with `kind: 'cancellation'`; maps `mode` to `reason` (`'withdrawal'` vs `'other'`); conditionally includes `note`; on success toasts, closes the dialog, and emits `'cancelled'`; on failure routes the error to the local `cancelError` state.
- **`useBlockingError`** — provides `cancelError` / `reportCancelError` / `clearCancelError` so refusals render inline via `InlineErrorAlert` rather than as a global toast.
- **`useFullscreenDialog`** / **`useReturnFocus`** — responsive fullscreen on small screens; restores focus to the triggering element on close.
- **`loading`** — read from the returns store via `storeToRefs`; disables the confirm button while a request is in flight.

## Relationships

- **`src/modules/returns/store.ts`** — imports `useReturnsStore` for the `openReturn` action and the `loading` ref. All cancellation requests flow through this store.
- **`src/modules/returns/components/WithdrawalPanel.vue`** — upstream caller in `buyer` mode; opens this dialog as a step in the withdrawal flow and listens for the `'cancelled'` emit to re-read the order.
- **`src/modules/returns/tests/cancel-remainder-dialog.spec.ts`** — unit-test spec exercising both modes, the submit path, and error display.

## Notes

- The refund figure shown to the user is always the **server's** value (`option.refundAmount`); the client never sums line items.
- `shippingRefund` is displayed conditionally (`> 0`) and only when the cancellation takes the last unit out of the order.
- In `buyer` mode the `note` field is omitted entirely from the payload (not just empty), and `reason` is hardcoded to `'withdrawal'`. In `staff` mode `reason` is `'other'` and `note` is included only when non-empty after trimming.
- The dialog is intentionally dumb about the step-up / refund-key prompt: that interaction lives in the HTTP layer and completes before `openReturn` resolves, so the component sees only a plain success or an error.
