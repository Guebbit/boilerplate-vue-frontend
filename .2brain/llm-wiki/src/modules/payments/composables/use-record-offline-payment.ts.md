---
source: src/modules/payments/composables/use-record-offline-payment.ts
sha256: 613ab141073f2feff765cf097266a7892e9238ec7e024fd4c02abab284839332
signature: 47b623ce1d1d52ea5fb88d856bada52b5102d32cd6ddaa9b62d52c18ce987fa8
generated_at: 2026-11-10T05:11:45.585882+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/composables/use-record-offline-payment.ts

## Purpose

Order-scoped composable that exposes a single "record payment by hand" action by delegating to the payments store. It exists to give the UI a clean, reactive API tied to a specific `orderId` (mirroring the `useOrderRefund` pattern) while keeping the store as the sole writer.

## Key elements

- **`useRecordOfflinePayment(orderId: Ref<string | undefined>)`** — the only export. Takes a reactive order ID (e.g. derived from the route) and returns an object with one method.
- **`recordOfflinePayment(body: RecordOfflinePaymentRequest)`** — calls `paymentsStore.recordOfflinePayment(orderId.value, body)`. If `orderId.value` is falsy the method silently resolves without touching the store. The store's return value is discarded via `.then(() => undefined)` so the caller receives no data back.

## Relationships

- **`store.ts`** — provides `usePaymentsStore`; the composable's sole dependency for the actual write. It holds the `recordOfflinePayment` action that performs the API call and cache update.
- **`RecordOfflinePaymentForm.vue`** — the consuming component that calls `recordOfflinePayment` from this composable to submit the "money arrived outside the provider" form.
- **`use-record-offline-payment.spec.ts`** — unit tests for the composable.

## Notes

- **No eligibility logic here.** Whether recording is possible (e.g. an in-flight card charge) is decided by the API; a 409 response is the caller's responsibility to surface as a toast, exactly as a decline is handled in the confirm flow.
- **Silent no-op on missing `orderId`.** If the reactive ref is still undefined (route not yet resolved), the method returns `Promise.resolve()` without any error or store call.
- **Store return value is discarded.** The store's resolution value (the refreshed payment) is consumed internally for caching and never forwarded to the caller; the composable maps it to `undefined`.
