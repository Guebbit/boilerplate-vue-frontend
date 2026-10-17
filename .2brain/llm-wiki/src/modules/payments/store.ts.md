---
source: src/modules/payments/store.ts
sha256: 0fedc4fe4e723137ab5716cab722122d5dc8642c3c92d132d84999eb64c1b4a5
generated_at: 2026-10-17T01:24:00.750053+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/store.ts

## Purpose

Pinia store (`usePaymentsStore`) that is the single client-side authority for payment state in the payments module. It wraps `useStructureRestApi`'s `fetchAny` for a shared loading flag, mirrors the API's payment record locally, and encapsulates the PSP intent → confirm → sync sequence plus the "404 means no payment yet" convention so that components never handle those concerns themselves.

## Key elements

- **`usePaymentsStore`** — the exported Pinia store (setup-store syntax, key `'payments'`).
- **`payment`** — `ref<Payment | undefined>`; the single payment behind the order currently being viewed. `undefined` means "no intent yet" (not an error).
- **`methods`** — `ref<PaymentMethodOption[]>`; the payment methods the deployment offers (re-validated server-side at checkout).
- **`paymentsPage` / `paymentsTotal`** — current page and total count for the staff payments list.
- **`refundsPage` / `refundsTotal`** — current page and total count for the refunds list.
- **`attention`** — `ref<PaymentAttentionItem[]>`; unresolved issues listed under "Needs attention".
- **`fetchMethods()`** — loads available payment methods.
- **`fetchPaymentForOrder(orderId)`** — loads (or clears) the local payment; treats a 404 as "none exists" via `rethrowUnlessAbsent`.
- **`payForOrder(orderId, paymentMethodRef, confirmOptions?)`** — creates a payment intent then confirms it with the provider's opaque method reference. Handles `requires_action` and `processing` as non-terminal successes. Accepts per-call axios overrides for the confirm step only (used by `PaymentPanel` to attach an anti-bot token on retry).
- **`finishAtProvider(paymentId)`** — calls `syncPayment` so the API re-reads the provider's record; used after a `requires_action` challenge or to exit `processing`.
- **`refundForOrder(orderId, amount?)`** — admin-only partial/full refund; updates the local `payment` (which withdraws the refund action from the UI).
- **`recordOfflinePayment(orderId, body)`** — admin-only record of a non-provider payment (cash, transfer). Caller reloads the order immediately (no in-flight PSP state).
- **`findOrderByReference(ref)`** — admin-only lookup of an order by RF creditor reference; 404 resolves to `undefined`.
- **`confirmIdempotencyKey` / `refundIdempotencyKey` / `offlineIdempotencyKey`** — per-action idempotency-key managers; key is resent on network/5xx retry, settled (or minted fresh) after a terminal outcome.

## Relationships

- **`PaymentPanel.vue`** — primary consumer of `fetchPaymentForOrder`, `payForOrder`, `finishAtProvider`; attaches `confirmOptions` (anti-bot token) on the confirm retry path.
- **`PaymentDrawer.vue`** — reads `payment` and `methods` to render the checkout drawer; triggers `payForOrder` and `fetchMethods`.
- **`PaymentMethodSelector.vue`** — renders choices from `methods`; feeds the selected `paymentMethodRef` back to the panel.
- **`RecordOfflinePaymentForm.vue`** — calls `recordOfflinePayment`; reads `findOrderByReference` to resolve the order first.
- **`OrderReferenceSearch.vue`** — UI around `findOrderByReference`; shows `undefined` as "no match".
- **`PaymentsTable.vue`** — displays `paymentsPage` / `paymentsTotal`; drives the staff list pagination.
- **`RefundsTable.vue`** — displays `refundsPage` / `refundsTotal`.
- **`AttentionList.vue`** — renders the `attention` array.
- **`use-order-refund.ts`** — composable that wraps `refundForOrder` with local UX state (confirm dialog, success toast).
- **`use-record-offline-payment.ts`** — composable that orchestrates `findOrderByReference` → `recordOfflinePayment` and the subsequent order reload.
- **Tests** (`payment-panel.spec.ts`, `payment-drawer.spec.ts`, `payments-tables.spec.ts`, `record-offline-payment-form.spec.ts`, `order-reference-search.spec.ts`) — exercise the store's actions and state transitions directly.

## Notes

- The store never sees card numbers; the provider's iframe tokenises the card and only an opaque `paymentMethodRef` crosses into this code.
- `payForOrder`'s `confirmOptions` parameter is deliberately scoped to the **confirm** call only — it is never forwarded to the intent step (the anti-bot gate does not guard that endpoint).
- `fetchPaymentForOrder` and `findOrderByReference` both treat **only** a 404 as a benign "empty" answer; any other error status is rethrown. This is handled by the shared `rethrowUnlessAbsent` helper.
- After `payForOrder`, the caller (not the store) is responsible for reloading the **order** once `payment.status === 'succeeded'`. After `recordOfflinePayment`, the caller reloads the order immediately because there is no in-flight PSP state.
- Idempotency keys are action-specific: a confirm key is never reused for a refund, and vice versa. Each key settles (success or error) and mints a fresh value for the next attempt.
