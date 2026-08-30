# src/modules/payments/index.ts

## Purpose

Public barrel (entry point) for the payments module. It deliberately exposes only the `PaymentPanel` component and the `useOrderRefund` composable, keeping the payments store internal to the module so that external callers cannot bypass the order-scoped payment flow.

## Key elements

- **`PaymentPanel`** (re-export from `./components/PaymentPanel.vue`) — the single UI component the order page mounts to perform payment actions on an order.
- **`useOrderRefund`** (re-export from `./composables/use-order-refund.ts`) — a composable for the operator's refund flow. Published because it is a separate, legitimate consumer (answers one question, performs one action) and is *not* a pay flow.

## Relationships

- **`src/modules/payments/components/PaymentPanel.vue`** — the component re-exported here; the only UI surface the module offers to the order page.
- **`src/modules/payments/composables/use-order-refund.ts`** — the composable re-exported here; the sole non-panel public API of the module.

## Notes

- The payments store is intentionally **not** exported. The doc comment makes the design rule explicit: a sibling reaching the store directly would create a second, parallel pay flow. If you need to trigger a payment, go through `PaymentPanel` in the context of an order.
- `useOrderRefund` is the only exception to the "keep it internal" rule, and the comment justifies it as a distinct concern (refund) rather than another pay path.
- Treat this file as a strict allow-list. Adding a new export here is an architectural decision, not a convenience re-export.
