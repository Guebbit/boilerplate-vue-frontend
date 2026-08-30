# src/modules/payments/components/PaymentPanel.vue

## Purpose

Order-page panel that renders either a card-payment form (while the order is still payable) or a payment status summary. It owns no payment logic itself; the intent/confirm sequence is delegated to the payments store, and the component's only job is to present the form or the result and notify the parent on success.

## Key elements

- **Props** — `orderId: string` (the order being paid) and `orderPayable?: boolean` (the order's own `actions.pay`, used only before a payment record exists).
- **`emit('paid')`** — fired after a successful charge so the parent can re-fetch the order.
- **`cardNumber` (ref)** — v-model for the card input; prefilled with `4242 4242 4242 4242` (demo success number).
- **`payable` (computed)** — decides whether the form or the status view is shown. Prefers `payment.actions.pay` once a payment record exists; falls back to the `orderPayable` prop before any intent is created.
- **`submitPayment()`** — calls `paymentsStore.payForOrder(orderId, cardNumber)`, adds a success notification and emits `paid` on resolve; routes errors through `notifyErrorMessages`.
- **`onMounted`** — calls `paymentsStore.fetchPaymentForOrder(orderId)` to load an existing payment (if any) for immediate status display.
- **Template** — a `v-card` containing either a `v-text-field` + `v-btn` form, a status row (`v-chip` + last-4 + formatted amount), or a "no payment" placeholder.

## Relationships

- **`src/modules/payments/store.ts`** — direct import. Reads `payment` and `loading` via `storeToRefs`; calls `fetchPaymentForOrder` on mount and `payForOrder` on submit. All payment-state logic lives there.
- **`src/modules/payments/index.ts`** — module barrel; this component is the panel export consumed by order-page screens.
- **`src/infrastructure/utils/logger.ts`** — no direct import visible in this file; interaction (if any) is indirect through the errors/notifications utilities.

## Notes

- **Demo prefilled card:** The field ships with `4242 4242 4242 4242` by design (comment states "this is a demo"). The decline hint is wired as the `v-text-field`'s `persistent-hint` so it is visually attached to the input rather than a separate paragraph.
- **Dual-source `payable`:** The computed deliberately checks `payment.actions.pay` first. This means the panel can flip to the status view the instant the store updates (e.g., after `payForOrder` resolves), even before the parent's order re-fetch returns.
- **`novalidate` on the form:** Browser-level validation is suppressed; the store/API is the source of truth for payment errors.
- **Status chip colour:** `refunded` maps to `warning`; all other statuses map to `success`.
- **Test hooks:** `data-test` attributes exist on the panel, card input, submit button, and status row for E2E selectors.
