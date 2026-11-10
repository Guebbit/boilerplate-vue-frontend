---
source: src/modules/payments/store.ts
sha256: 05c549487aacf21ae63d38774e43affc01ba2300a3991de3021dd973b8a2ba6c
signature: 15854c15a57b360dc360fab8cf74a69d675b9e1404364ffa8cd3d71a9eef7673
generated_at: 2026-11-10T05:13:14.934661+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/store.ts

## Purpose

Pinia setup-store for the payments module. It owns the local `payment` record, wraps every API call through the toolkit's `fetchAny` (loading flag included), centralises the PSP intent → confirm → sync sequence, and encodes the "empty list means no payment yet" convention so that components never re-implement it.

## Key elements

- **`usePaymentsStore`** – the exported Pinia store (`defineStore('payments', …)`).
- **`payment`** – `ref<Payment | undefined>`; the single cached payment for the order the page is showing. `undefined` means "no intent started yet."
- **`loading` / `fetchAny`** – from `useStructureRestApi`; every action routes through `fetchAny` to get a shared loading flag.
- **`confirmIdempotencyKeys` / `refundIdempotencyKeys` / `offlineIdempotencyKeys`** – per-subject idempotency-key holders (per order for confirm, per payment for refund, per order for offline record). A key is settled after *any* response (success or failure); the next call mints a fresh one.
- **`methods`** / **`fetchMethods()`** – cached list of payment-method options the deployment offers; checkout re-validates server-side.
- **`fetchPaymentForOrder(orderId)`** – `GET /orders/{id}/payments`; an empty `items` array is the "no payment yet" signal (not a 404).
- **`readPayment(paymentId)`** – `GET /payments/{id}` that does **not** write to the shared `payment` ref; used by screens outside the order page (e.g. attention-list drawer).
- **`payForOrder(orderId, paymentMethodRef, confirmOptions?)`** – runs `createPayment` → `confirmPayment`. `confirmOptions` is forwarded to the confirm call only (e.g. an anti-bot token). The returned record replaces `payment`.
- **`finishAtProvider(paymentId, orderId)`** – calls `syncPayment` after a `requires_action` challenge or to exit `processing`; idempotent at the API.
- **`refundPayment({ id, orderId }, amount?)`** – creates a refund (partial or full), then re-reads the payment to refresh totals and available actions.
- **`rereadAfterFault(orderId, error, …staleCodes)`** – internal helper: on a 5xx or a listed stale-code it silently re-reads the payment, then rethrows the original error unchanged.
- Additional actions visible in the import list: `settleRefundByHand`, `cancelRefund`, `recordOfflinePayment`, `searchPayments`, `listRefunds`, `listPaymentAttention` (content truncated).

## Relationships

- **Components** (`PaymentPanel.vue`, `PaymentDrawer.vue`, `PaymentMethodSelector.vue`, `PaymentsTable.vue`, `RefundsTable.vue`, `RecordOfflinePaymentForm.vue`, `AttentionList.vue`, `AwaitingTransfersTable.vue`, `OrderDisputes.vue`, `OrderReferenceSearch.vue`) – consume `payment`, `loading`, `methods` and call the store's actions (`payForOrder`, `finishAtProvider`, `refundPayment`, `readPayment`, `fetchPaymentForOrder`, `fetchMethods`, etc.).
- **Composables** (`use-order-refund.ts`, `use-record-offline-payment.ts`) – thin wrappers around the corresponding store actions, adding UI-level state (form fields, validation) before delegating.
- **Tests** (`payment-drawer.spec.ts`, `order-reference-search.spec.ts`, `dispute-banner.spec.ts`) – mock or exercise the store to verify component behaviour against payment states.

## Notes

- `payment` is **shared mutable state**. Any screen that is *not* the order page must use `readPayment` instead of `fetchPaymentForOrder` / `payForOrder` to avoid clobbering what the order page holds.
- The "no payment yet" signal is an **empty list** from `listOrderPayments`, not a 404. A true 404 on that endpoint means the order itself is invisible.
- `rereadAfterFault` **always rejects** with the original error; the re-read is best-effort (its own failure is swallowed). Callers still see the error.
- Idempotency keys are scoped per subject and settled on *every* outcome (success, decline, transport fault). A retry after a lost connection reuses the same key; any completed response mints a new one.
- The store never handles card numbers—only opaque provider-issued method references.
- `confirmOptions` (axios overrides) is applied **only** to the confirm step; the intent step is never gated by the anti-bot check.
