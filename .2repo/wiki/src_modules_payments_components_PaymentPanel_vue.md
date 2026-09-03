# src/modules/payments/components/PaymentPanel.vue

## Purpose

Order-page payment card that shows either a single-field card form (while the order is still payable) or a read-only status row (after a payment record exists). It owns no payment logic itself — the two-step intent/confirm flow lives in the payments store; this component only collects the card number, fires the store call, surfaces the result as a toast, and tells the parent to refetch the order.

## Key elements

- **`payable` (computed)** — Decides form vs. status view. Prefers `payment.actions.pay` once a payment record is loaded (the API folds the order status into it); falls back to the `orderPayable` prop before any intent exists.
- **`submitPayment`** — Calls `paymentsStore.payForOrder(orderId, cardNumber)`, adds a success toast + emits `'paid'` on resolve, or routes the error through `notifyErrorMessages` on reject.
- **`cardNumber` (ref)** — Prefilled with `4242 4242 4242 4242`; the Vuetify text field's persistent hint tells the user which number triggers a decline.
- **Props** — `orderId: string` (required), `orderPayable?: boolean` (the order's `actions.pay`).
- **Emits** — `'paid'` after a successful charge so the parent re-reads the order.
- **`onMounted`** — Fires `paymentsStore.fetchPaymentForOrder(orderId)` to load any existing payment.
- **Template** — Vuetify `v-card` with three branches: form (`v-if="payable"`), status chip + last-4 + formatted amount (`v-else-if="payment"`), or a "no payment" message (`v-else`).

## Relationships

- **`src/modules/payments/store.ts`** — Consumes `usePaymentsStore` via Pinia; calls `payForOrder` and `fetchPaymentForOrder`; reads reactive `payment` and `loading` refs through `storeToRefs`.
- **`src/modules/payments/index.ts`** — Module barrel; this component is part of the payments feature slice that index exports.
- **`@/infrastructure/utils/errors.ts`** — Imports `notifyErrorMessages` to format and dispatch error toasts.
- **`@/infrastructure/utils/formatters.ts`** — Imports `formatCurrency` for the amount display in the status row.
- **`@guebbit/vue-toolkit`** — Imports `useNotificationsStore` for the `addMessage` toast API.

## Notes

- The decline path is one documented number away from the prefilled success number; the hint is wired as the field's own `persistent-hint` (not a sibling paragraph) so it is visually tied to the input.
- `payable` is intentionally a dual-source computed: the payment record's `actions.pay` takes precedence over the parent-supplied `orderPayable`, which means the panel can flip to "status" the instant the API response lands, before the parent's order refetch resolves.
- `data-test` attributes are present on the card, input, submit button, and status row for E2E selectors.
- `novalidate` on the form plus `inputmode="numeric"` means the browser does no card-format validation; the server (via the store call) is the sole gatekeeper.
