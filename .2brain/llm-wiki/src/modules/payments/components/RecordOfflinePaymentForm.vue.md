---
source: src/modules/payments/components/RecordOfflinePaymentForm.vue
sha256: b0990449b24dd9f17fd1b99b421d075e17c04f535510c47ddd489f2d0f01218a
signature: b0990449b24dd9f17fd1b99b421d075e17c04f535510c47ddd489f2d0f01218a
generated_at: 2026-11-10T05:09:51.430515+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/RecordOfflinePaymentForm.vue

## Purpose

A Vue form component that lets an operator record an offline payment (cash, transfer, etc.) against a specific order. It owns only field state and client-side validation; the actual settlement call is delegated to `useRecordOfflinePayment`. On success it clears its fields and emits `'recorded'` so the parent page can reload the order.

## Key elements

- **`props.orderId`** — the order this form settles; the component is only rendered while the order is still payable (enforced by the caller).
- **`emit('recorded')`** — fired once the payment is confirmed server-side; the owning page uses this to re-fetch the order (status moved `pending → paid`).
- **`schema` (zod)** — validates three fields: `method` (required enum), `reference` (optional string, max length from `offlineReferenceMax`), `receivedAt` (optional `YYYY-MM-DD` date string).
- **`useStructureFormValidation`** — provides `form`, `formErrors`, `showFormErrors`, `handleSubmit`, `applyServerErrors`; re-validates on locale change.
- **`submitForm`** — calls `handleSubmit`, converts `receivedAt` to an ISO timestamp (`new Date(\`${date}T00:00\`).toISOString()`), passes `reference` as `undefined` when empty, and routes errors: field-level errors land on the field via `applyServerErrors`; unmapped/server-level errors are stored in the blocking-error slot.
- **`useBlockingError`** — local blocking state (`recordError`, `reportRecordError`, `clearRecordError`) rendered by `InlineErrorAlert`; used for race-condition refusals (e.g. a card charge still in flight) that don't map to a specific field.
- **`methods`** — `Object.values(RecordOfflinePaymentRequestMethod)`; excludes `card` (that path belongs to customer checkout).
- **`loading`** — read from `usePaymentsStore` via `storeToRefs`; disables the submit button while the record write is in flight.

## Relationships

- **`src/modules/payments/composables/use-record-offline-payment.ts`** — provides the `recordOfflinePayment` function (the single API call this form performs). The composable receives a computed `orderId` from this component's prop.
- **`src/modules/payments/schemas.ts`** — exports `offlineReferenceMax`, used as the max-length constraint in the zod schema.
- **`src/modules/payments/store.ts`** — `usePaymentsStore` supplies the shared `loading` flag that gates the submit button.
- **`src/modules/payments/tests/record-offline-payment-form.spec.ts`** — unit/E2E tests targeting this component (selectors: `data-test="record-offline-payment-form"`, `record-offline-method`, `record-offline-reference`, `record-offline-received-at`, `record-offline-submit`, `record-offline-payment-error`).

## Notes

- The component has a separate non-setup `<script>` block solely to declare `name: 'RecordOfflinePaymentForm'` (required for `<KeepAlive>` / devtools since `<script setup>` cannot set it).
- `receivedAt` is stored as a plain date string in the form but converted to a full ISO date-time at submit time to satisfy the API contract. If the operator leaves it empty, it is omitted from the request and the API defaults to "now."
- The form uses `novalidate` on the `<form>` element; all validation is handled by `useStructureFormValidation`, not native HTML constraints.
- A 409 (card charge already in flight) surfaces through the blocking-error path (`InlineErrorAlert`), not as a field error — the operator sees a full-width alert and must retry.
- On success the form resets `reference` and `receivedAt` to empty strings but leaves `method` at its current value, so consecutive records default to the last-used method.
