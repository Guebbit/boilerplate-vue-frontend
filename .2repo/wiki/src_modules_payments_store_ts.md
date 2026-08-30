# src/modules/payments/store.ts

## Purpose

Pinia store that owns the payments module's client-side state. It mirrors the API's payment record for the current order and concentrates the two PSP-specific rules — the intent → confirm sequence and "404 means no payment yet" — in one place so callers never reason about them directly.

## Key elements

- **`usePaymentsStore`** – the store (id `"payments"`). Exposes:
  - **`payment`** (`Ref<Payment | undefined>`) – the order's payment record, or `undefined` when none exists.
  - **`loading`** – reactive flag delegated from `useCoreStore` via `useStructureRestApi`.
  - **`fetchPaymentForOrder(orderId)`** – loads the payment; a 404 is treated as "no intent yet" (resolves `undefined`), any other error is rethrown.
  - **`payForOrder(orderId, cardNumber)`** – creates a payment intent then confirms it with the card in one chain; the API's response replaces `payment`.
  - **`refundForOrder(orderId)`** – calls the admin-only refund endpoint; updates `payment` in place so the UI can withdraw the refund action.
- **`absentIs(error, 404)`** – imported utility used to distinguish "not found" from real failures in `fetchPaymentForOrder`.

## Relationships

- **`src/modules/payments/components/PaymentPanel.vue`** – Consumes this store to render the pay form (when `payment` is `undefined`) or the payment status, and to invoke `payForOrder` / `fetchPaymentForOrder`.
- **`src/modules/payments/composables/use-order-refund.ts`** – Calls `refundForOrder` to execute the operator's standalone refund and reads the updated `payment` to disable the refund control.

## Notes

- `fetchPaymentForOrder` deliberately swallows **only** 404s; any other error (network, 500) propagates so a caller doesn't mistakenly render the pay form over an already-paid order.
- `payForOrder` assumes the intent exists or is created fresh — it does **not** idempotency-check; the API is responsible for that.
- After `payForOrder` or `refundForOrder` resolves, the caller is expected to **reload the parent order**, not the payment, since the order's status is what actually changed server-side.
- The store does not persist `payment` across navigation; it is transient per-order state.
