---
source: src/modules/payments/composables/use-order-refund.ts
sha256: 478c6ec23a1ace0203b12511dcfd3964ad4b2a6a066c27b5c1aab2b6d648cddd
signature: bd099b01e6db0e45d71a5f9b31c8e32d13e34c78f3e171c501ad1b5eab729d18
generated_at: 2026-11-10T05:11:02.034086+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/composables/use-order-refund.ts

## Purpose

A Vue composable that wraps the payments store's refund flow for a single order, making the refund state and actions reactive to a caller-supplied `Ref<string | undefined>` order id. It exists so that an order-detail or edit view can show a refund control and call it without importing the payments store directly — a deliberate narrow exception to the module barrel, scoped by shape (one question, one action) so no caller can grow a full payment flow from it.

## Key elements

- **`useOrderRefund(orderId)`** — the sole export. Accepts a reactive order-id ref and returns an object with:
  - `canRefund` (Computed) — true only when `payment.actions.refund === true`; the server's verdict, not a local status derivation.
  - `settleable` (Computed) — the subset of `payment.refunds` whose ids appear in `payment.actions.settleByHand`, i.e. hand-paid refunds awaiting operator confirmation.
  - `refundLoading` (Ref) — the payments-store in-flight flag; distinct from the orders store's `loading`, so a button gated only on the orders store will *not* block a double-click during `refund()`.
  - `refund(amount?)` — performs a full or partial refund via `paymentsStore.refundPayment`, pads the amount with the payment's own decimal scale, and on success returns a `{ text, type }` toast built by `refundNotice`. Resolves `undefined` if no payment is loaded.
  - `cancelNotice(doneKey)` — reads the *refreshed* payment (`displayStatus`, `actions.settleByHand`) and returns an i18n string describing what the cancel's refund actually became.
  - `settle(refundId)` — confirms one hand-paid refund was returned outside the app; resolves once the refreshed payment replaces the cache.
  - `refreshPayment()` — forces a re-fetch of the payment for the current `orderId.value`, used after an order-level mutation (e.g. cancel) so `canRefund` reflects fresh state.

## Relationships

- **`src/modules/payments/store.ts`** — the composable calls `usePaymentsStore()` and reads `payment`, `loading`, `fetchPaymentForOrder`, `refundPayment`, `settleRefundByHand` from it. All side-effects flow through this store.
- **`src/modules/payments/refund-notice.ts`** — called inside `refund()` to build the post-refund toast from the server's refund record, settleable ids, and an i18n key.
- **`src/modules/payments/index.ts`** — the module barrel. The file's doc comment explicitly states the barrel keeps `usePaymentsStore` *out* of its public surface so siblings cannot build a second pay flow; this composable is the documented narrow exception that reaches the store directly.
- **`src/modules/payments/tests/use-order-refund.spec.ts`** — unit-test spec covering this composable's returned members.

## Notes

- **Do not gate the refund button solely on the orders store's `loading`.** The refund runs under the payments store; without also checking `refundLoading` a second click can fire while the first `refundPayment` call is still in flight.
- **`canRefund` is server-authoritative.** It mirrors `actions.refund` from the API payload. Re-deriving it from a local `status` field would split the rule across deploy units and is explicitly avoided.
- The `watch` uses `{ immediate: true }`, so if `orderId` is already set at composable creation the payment is fetched synchronously (well, on the next microtask) — no separate `onMounted` fetch is needed by the caller.
- `refund()` and `settle()` both resolve `undefined` (not an error) when `payment.value` is null, silently no-opping rather than throwing. Callers that need to distinguish "nothing to do" from "something went wrong" must check `canRefund` / `settleable` first.
- Amounts passed to `refund()` are padded to the payment's own scale via `padDecimal(amount, decimalScale(payment.value.amount))`; passing an unpadded string like `"12.5"` will be normalised to `"12.50"` (or whatever the payment's scale dictates).
