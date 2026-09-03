# src/modules/payments/composables/use-order-refund.ts

## Purpose

A Vue composable that exposes a single-order refund control (`canRefund` + `refund()`) by delegating to the payments Pinia store. It exists so that UI components can act on one order's refund without importing the store directly, keeping the refund surface narrow and reactive to route-driven order changes.

## Key elements

- **`useOrderRefund(orderId: Ref<string | undefined>)`** — the sole export.
  - Calls `paymentsStore.fetchPaymentForOrder(id)` whenever `orderId` changes (including immediately on setup).
  - Returns:
    - `canRefund: ComputedRef<boolean>` — true only when the server-provided `payment.actions.refund` flag is `true`.
    - `refund(): Promise<void>` — calls `paymentsStore.refundForOrder(id)`; resolves `undefined` so the cached payment refresh is what withdraws `canRefund`. No-ops if `orderId` is falsy.

## Relationships

- **`src/modules/payments/store.ts`** — source of all real work: `fetchPaymentForOrder`, `refundForOrder`, and the reactive `payment` state (via `storeToRefs`). This composable is a thin read/dispatch layer over those.
- **`src/modules/payments/index.ts`** (barrel) — re-exports this composable to sibling modules but deliberately does *not* re-export `usePaymentsStore`. This file is the sanctioned narrow entry point for refund actions outside the payments panel.

## Notes

- `canRefund` is **never** computed locally from order status. The server's `actions.refund` flag is the single source of truth; re-deriving it client-side would split the rule across separately deployed artifacts.
- `refund()` intentionally does **not** mutate the order's status — it only triggers the money-return flow. Status changes, if any, happen server-side.
- The barrel's restriction is "narrow by shape": this composable answers one question and performs one action, so a caller cannot grow a full payment flow out of it. Avoid adding further store methods here.
