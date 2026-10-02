---
source: src/modules/payments/composables/use-record-offline-payment.ts
sha256: 613ab141073f2feff765cf097266a7892e9238ec7e024fd4c02abab284839332
generated_at: 2026-10-02T15:28:38.489776+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/composables/use-record-offline-payment.ts

## Purpose
Thin composable that exposes a single `recordOfflinePayment` call for one order, delegating the actual API request and state mutation to the payments store. It exists so view components (e.g. the offline-payment form) can invoke the store action without importing the store directly, and so the `orderId` can be kept reactive across route changes.

## Key elements
- **`useRecordOfflinePayment(orderId: Ref<string | undefined>)`** — The sole export. Accepts a reactive order ID and returns an object with one method.
- **`recordOfflinePayment(body: RecordOfflinePaymentRequest)`** — Calls `paymentsStore.recordOfflinePayment(orderId.value, body)`. If `orderId.value` is falsy, short-circuits to `Promise.resolve()` instead of hitting the store. The store's resolved payment value is discarded via `.then(() => undefined)`, so callers receive `Promise<void>`.

## Relationships
- **`src/modules/payments/store.ts`** — Source of `usePaymentsStore()`. This composable performs exactly one write (`recordOfflinePayment`) through that store; it does not read any other store state.
- **`src/modules/payments/components/RecordOfflinePaymentForm.vue`** — Expected consumer. The form supplies the reactive `orderId` and the `RecordOfflinePaymentRequest` body, and is responsible for surfacing HTTP errors (409 conflict, declines) as toasts. This composable does **not** catch or interpret HTTP status codes.

## Notes
- No error handling lives here. A 409 (in-flight card charge) or a decline is the *caller's* responsibility to present, mirroring how `useOrderRefund` leaves toast logic to its consumer.
- The `orderId` parameter is typed as `Ref<string | undefined>` on purpose: a `null`/`undefined` value silently no-ops rather than throwing, which keeps the form safe during route transitions before the order loads.
- The resolved payment object from the store is intentionally dropped (`→ undefined`). Callers that need the refreshed payment should read it back from the store.
