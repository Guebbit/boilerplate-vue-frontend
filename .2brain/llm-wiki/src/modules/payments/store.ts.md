---
source: src/modules/payments/store.ts
sha256: 1258e0357b57d4f11cafe9fbc816f7dc07f80b74cef97ac7f38ec812cd572ca0
generated_at: 2026-10-02T15:30:00.321921+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/store.ts

## Purpose

Pinia setup store that centralises the payments module's server interaction: it mirrors the API's payment record locally, owns the PSP intent → confirm → (sync) sequence, and applies the "404 means no payment yet" convention in one place so components never interpret raw HTTP statuses.

## Key elements

- **`usePaymentsStore`** — the single exported Pinia store (`defineStore('payments', …)`), set-up style.
- **`loading`** — reactive flag from `useStructureRestApi`, true while any action is in flight.
- **`payment`** — `ref<Payment | undefined>`; the current order's payment as the API last reported it. `undefined` means "no intent yet."
- **`methods`** — `ref<PaymentMethodOption[]>`; the deployment's available payment methods (always `card`, optionally `bank_transfer`).
- **`fetchMethods()`** — populates `methods` via `listPaymentMethods()`.
- **`fetchPaymentForOrder(orderId)`** — loads the payment for an order; treats 404 as `undefined` (not an error).
- **`payForOrder(orderId, paymentMethodRef, confirmOptions?)`** — runs `createPaymentIntent` → `confirmPayment` in sequence; uses a paired idempotency-key pair so a retry after 5xx/network failure at either step resends both unchanged. `confirmOptions` (e.g. an antibot token) applies to the confirm step only.
- **`finishAtProvider(paymentId)`** — calls `syncPayment` to re-read the provider's record after a `requires_action` challenge or to resolve `processing`. Idempotent at the API.
- **`refundForOrder(orderId, amount?)`** — admin-only partial/full refund via `refundPaymentByOrder`; own idempotency key.
- **`recordOfflinePayment(orderId, body)`** — admin-only; records cash/transfer via `recordOfflinePaymentRequest`; own idempotency key.
- **`findOrderByReference(ref)`** — admin-only lookup of an order by RF creditor reference; 404 resolves `undefined`.

## Relationships

- **`PaymentPanel.vue`** — primary consumer: calls `fetchPaymentForOrder`, `payForOrder` (passing `confirmOptions` with a solved antibot token on retry), and `finishAtProvider`; reads `payment` and `loading`.
- **`PaymentMethodSelector.vue`** — calls `fetchMethods` and renders from the `methods` ref.
- **`OrderReferenceSearch.vue`** — calls `findOrderByReference` to resolve a bank-statement reference to an order.
- **`RecordOfflinePaymentForm.vue`** — calls `recordOfflinePayment` after the operator fills in method/reference/date.
- **`use-order-refund.ts`** — composable that wraps `refundForOrder` and exposes the resulting `payment` to the calling view.
- **`use-record-offline-payment.ts`** — composable orchestrating the `findOrderByReference` → `recordOfflinePayment` flow for the offline-payment screen.

## Notes

- **404 is a valid answer, not an error.** Both `fetchPaymentForOrder` and `findOrderByReference` swallow 404 via `rethrowUnlessAbsent(error, 404)` and resolve `undefined`. Any other status still rejects.
- **Paired idempotency keys.** `intentIdempotencyKey` and `confirmIdempotencyKey` settle together—on success *or* failure—so the pair is atomically reusable for the next `payForOrder` call.
- **No card data in this store.** The `paymentMethodRef` parameter is an opaque provider token (from an iframe widget); the store never handles PANs.
- **Caller reloads the order, not the store.** After `payForOrder` the caller re-fetches the order once `payment.status === 'succeeded'`; after `recordOfflinePayment` the caller reloads the order immediately (no in-flight PSP state to wait for).
- **`confirmOptions` is step-scoped.** It is forwarded only to `confirmPayment`, never to `createPaymentIntent`, matching the server-side antibot gate that protects the confirm endpoint.
