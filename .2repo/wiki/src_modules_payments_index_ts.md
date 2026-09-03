# src/modules/payments/index.ts

## Purpose

Public barrel for the payments module. It is the only file outside the module that may be imported from, exposing exactly two things: the `PaymentPanel` component (the UI through which a payment is initiated on an order) and the `useOrderRefund` composable (the operator's refund action). Everything else — including the payments store — stays private to the module.

## Key elements

- **`PaymentPanel`** (default re-export from `./components/PaymentPanel.vue`) — the panel an order page mounts; the single sanctioned entry point for initiating a payment.
- **`useOrderRefund`** (named re-export from `./composables/use-order-refund.ts`) — a composable that answers one question (refund status) and performs one action (trigger a refund). Published separately because refunding is a distinct consumer flow, not a second payment path.

## Relationships

- **`src/modules/payments/components/PaymentPanel.vue`** — re-exported as the default-named `PaymentPanel`; this is the component the rest of the app mounts.
- **`src/modules/payments/composables/use-order-refund.ts`** — re-exported as named `useOrderRefund`; the only composable surfaced externally.

Both re-exports are the *sole* public surface of the module; no store, utility, or sub-module file is exposed.

## Notes

- The module intentionally does **not** re-export its internal store. The doc comments make the design rule explicit: a sibling component that needs to pay must go through `PaymentPanel`; reaching for the store directly would create a parallel pay flow.
- `useOrderRefund` is allowed as an exception because it performs a different action (refund) rather than duplicating the pay flow, but the convention still holds: if a future composable *does* initiate a payment, it must stay unexported and be consumed inside `PaymentPanel` instead.
