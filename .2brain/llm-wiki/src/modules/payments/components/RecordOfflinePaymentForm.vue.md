---
source: src/modules/payments/components/RecordOfflinePaymentForm.vue
sha256: 8d8fd1cadba7180a935a651b56a5e7fd0b01f16718bee4ec5c824683efc15e19
generated_at: 2026-10-17T01:22:28.488089+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/RecordOfflinePaymentForm.vue

## Purpose

Operator-facing form for recording a payment that arrived outside the card checkout (cash, transfer, etc.). It owns the field state, client-side validation, and submit flow; the actual API write is delegated to a composable. On success it emits `recorded` so the parent can reload the order, since the server-side status change (`pending → paid`) is invisible to this component.

## Key elements

- **Props:** `orderId: string` — the order to pay. The caller only renders this form while the order is still payable.
- **Emits:** `recorded` — fires after a successful write; the parent uses it to refresh the order view.
- **`schema`** (Zod) — validates three fields: `method` (enum of offline methods), `reference` (optional, ≤ 120 chars), `receivedAt` (optional date string).
- **`useStructureFormValidation`** — wires the schema to a Vuetify form, manages `formErrors`, `showFormErrors`, `handleSubmit`, and `applyServerErrors`. Re-validates on locale change.
- **`useRecordOfflinePayment(computed(() => props.orderId))`** — the single API call the form performs.
- **`useBlockingError`** — catches server refusals that don't map to a specific field (e.g. 409 "card charge in flight") and surfaces them as a full-width `InlineErrorAlert`.
- **`submitForm`** — orchestrates validation → clear blocking error → call composable → on success: toast, clear `reference`/`receivedAt`, emit `recorded`; on failure: `applyServerErrors` with `onUnmapped` falling back to the blocking error.
- **Template** — a `<form>` with a `v-select` (method), two `v-text-field`s (reference, date), a submit `v-btn` disabled while `loading`, and an `InlineErrorAlert`.

## Relationships

- **`src/modules/payments/composables/use-record-offline-payment.ts`** — imported as `useRecordOfflinePayment`; provides the `recordOfflinePayment` function that performs the actual settlement write.
- **`src/modules/payments/store.ts`** — imported as `usePaymentsStore`; the form reads `loading` via `storeToRefs` to disable the submit button during the in-flight request.
- **`src/modules/payments/tests/record-offline-payment-form.spec.ts`** — the unit-test spec covering this component's validation, submit, and error paths.

## Notes

- The top-level `<script>` block exists solely to declare `name: 'RecordOfflinePaymentForm'` so `<KeepAlive>` and devtools can identify the component; `<script setup>` cannot set a name on its own.
- `receivedAt` is a bare `YYYY-MM-DD` from the HTML date input. At submit time it is appended with `T00:00` and converted to an ISO 8601 timestamp to satisfy the API contract, which expects a full date-time.
- `card` is deliberately absent from `methods` — that path belongs to the customer's own checkout, not the operator's offline form.
- This component does **not** gate on order status. If the API rejects the write (e.g. a concurrent card charge), the server message is surfaced verbatim via `useBlockingError`; the operator retries or navigates away.
- `reference` and `receivedAt` are both optional; empty values are sent as `undefined` so the API can apply its own defaults.
