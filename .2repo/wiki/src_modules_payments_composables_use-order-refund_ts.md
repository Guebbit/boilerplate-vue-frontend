# src/modules/payments/composables/use-order-refund.ts

## Purpose

Vue composable that exposes a single order's refund capability (eligibility check + action) from the payments store, reactive to a route-driven order ID. It exists so views can bind a refund control without importing the store directly.

## Key elements

- **`useOrderRefund(orderId: Ref<string | undefined>)`** — the sole export. Accepts a reactive order ID and returns:
  - **`canRefund`** (`ComputedRef<boolean>`) — `true` only when the server-provided `payment.actions.refund` flag is `true`. Updates automatically when the store's `payment` ref is replaced.
  - **`refund()`** (`() => Promise<void>`) — calls `paymentsStore.refundForOrder(id)`. Resolves once the refreshed payment replaces the cache (which flips `canRefund` to `false`). No-ops (`Promise.resolve()`) if `orderId` is currently `undefined`.
- **Internal `watch(orderId, …)`** — on mount and on every ID change, calls `paymentsStore.fetchPaymentForOrder(id)` to populate the store's `payment` ref.

## Relationships

- **`src/modules/payments/store.ts`** — consumed via `usePaymentsStore()` and `storeToRefs`. Reads the `payment` state and calls `fetchPaymentForOrder` / `refundForOrder` actions.
- **`src/modules/payments/index.ts`** (barrel) — intentionally does *not* re-export `usePaymentsStore`. `useOrderRefund` is the narrow exception that re-enters the store, so sibling modules that only need a refund control don't reach into the store and grow a second payment flow.

## Notes

- **Eligibility is server-owned.** Whether a refund is possible is read from `payment.actions.refund` (set by the API). Do not re-derive it from a local status field; that would split the rule across separately deployed clients.
- **`refund()` does not mutate order status.** It only returns the money and refreshes the cached payment object. Any status change is a server-side side-effect surfaced through that refresh.
- **The `orderId` param is reactive by contract.** Pass a `Ref` (e.g. from `useRoute().params.id`) so a route change re-fetches and re-evaluates eligibility without re-mounting the composable.
