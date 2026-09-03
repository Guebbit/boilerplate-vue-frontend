# src/modules/payments/store.ts

## Purpose

Pinia store for the payments module. It mirrors the API's payment record locally and encapsulates the two-step PSP sequence (create intent → confirm) plus the "404 means no payment yet" convention, so components never call the payment APIs directly.

## Key elements

- **`usePaymentsStore`** — Setup-style Pinia store (id `'payments'`). Exposes `payment`, `loading`, `fetchPaymentForOrder`, `payForOrder`, `refundForOrder`.
- **`payment: Ref<Payment | undefined>`** — The current order's payment record. `undefined` while no intent exists (guest, pre-payment, or a 404 response).
- **`fetchPaymentForOrder(orderId)`** — Loads the payment via `getPaymentByOrder`. Treats a 404 as a valid "no payment" answer (resolves with `undefined`); rethrows all other errors.
- **`payForOrder(orderId, cardNumber)`** — Two-step PSP call: `createPaymentIntent` → `confirmPayment`. On success the returned record replaces `payment.value`; on decline the promise rejects. The caller is expected to reload the *order* afterward.
- **`refundForOrder(orderId)`** — Calls `refundPaymentByOrder` (admin-only at the API level; a 403 rethrows naturally). Updates the cached `payment` record so downstream UI can react.
- **`loading`** — Re-exported from `useStructureRestApi`, driven by `useCoreStore`'s `getLoading`/`setLoading`.

## Relationships

- **`src/modules/payments/components/PaymentPanel.vue`** — Consumes this store: reads `payment` and `loading` to decide whether to render the pay form (when `payment` is `undefined`) or the paid/refunded view, and calls `payForOrder` on form submit.
- **`src/modules/payments/composables/use-order-refund.ts`** — Calls `refundForOrder` for the operator's standalone refund flow and inspects `payment` state to gate the refund action (e.g., hiding it once a payment is already refunded).

## Notes

- **404 is not an error.** `fetchPaymentForOrder` deliberately swallows only the 404 via `absentIs(error, 404)`; every other error type propagates. Components must treat `payment === undefined` as a valid "show the form" state, not a failure.
- **Caller reloads the order, not the store.** After `payForOrder` resolves, the *order* record's status has changed; the store does not update the order itself.
- **Refund is admin-gated server-side.** The store performs no role check; it simply rethrows whatever the API returns (expect 403 for non-admins).
- **`fetchAny` wraps every action**, so `loading` reflects in-flight payment requests uniformly.
