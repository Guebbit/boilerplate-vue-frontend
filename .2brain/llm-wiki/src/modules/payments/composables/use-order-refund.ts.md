---
source: src/modules/payments/composables/use-order-refund.ts
sha256: 82bd82915b359bd98da278580efad4ff490a0b16da62d0cb30c3502fb911dad7
generated_at: 2026-10-17T01:23:13.793974+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/composables/use-order-refund.ts

## Purpose

A Vue composable that exposes a single-order refund control—whether a refund is possible and how to perform it—reactive to an order-id ref. It exists so that a refund button and its gating logic can live outside the payments panel without importing the store directly; it is the one deliberate exception to the barrel's policy of keeping `usePaymentsStore` internal.

## Key elements

- **`useOrderRefund(orderId: Ref<string | undefined>)`** — the sole export. Accepts a reactive order id and returns:
  - **`canRefund`** — `computed`; true only when the server-populated `payment.actions.refund === true`. Never re-derived client-side from a status field.
  - **`refundLoading`** — the payments store's own `loading` flag (via `storeToRefs`), distinct from the orders store's loading key.
  - **`refund(amount?)`** — calls `paymentsStore.refundForOrder`; `amount` enables a partial refund. Resolves once the refreshed payment replaces the cached one (which flips `canRefund` to false). No-ops when `orderId` is undefined.
  - **`refreshPayment()`** — forces a cache-busting re-fetch of the payment for the current order id. Intended for callers that changed the *order* (e.g. a cancel) rather than the payment itself. No-ops when `orderId` is undefined.
- **Internal `watch(orderId, …, { immediate: true })`** — fetches the payment immediately if the id is already set, and re-fetches on subsequent changes.

## Relationships

- **`src/modules/payments/store.ts`** — consumes `usePaymentsStore`; reads `payment`, `loading`, and calls `fetchPaymentForOrder` / `refundForOrder` on it.
- **`src/modules/payments/index.ts`** — the barrel deliberately withholds `usePaymentsStore` from external import; this composable is the published surface through which a sibling component reaches refund capability without a second pay flow.
- **`src/modules/payments/tests/use-order-refund.spec.ts`** — unit tests for this composable.

## Notes

- Deliberately narrow by shape: it answers one question (`canRefund`) and performs one action (`refund`). It is *not* a general payment-flow entry point, and callers should not build additional payment logic on top of it.
- `canRefund` reads the server-decided `actions.refund` flag. Re-deriving it from a local status would split the refund rule across separately deployed clients.
- A refund button **must** also disable on `refundLoading` (the payments store's flag), not solely on the caller's orders-store `loading`, or a double-click during `refund()` is not blocked.
- `refund()` and `refreshPayment()` both silently resolve (`Promise.resolve()`) when `orderId.value` is undefined—no error, no fetch.
