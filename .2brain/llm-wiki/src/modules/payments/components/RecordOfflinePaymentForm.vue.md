---
source: src/modules/payments/components/RecordOfflinePaymentForm.vue
sha256: 9cf4095a252f2c1bf16e4d9a785bf3359e416bb44fd17686c14f1bf187a885a1
generated_at: 2026-10-02T15:28:21.764801+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/RecordOfflinePaymentForm.vue

## Purpose

A Vuetify form that lets an operator record a payment received outside the card checkout (cash at the counter, phone transfer, etc.). It owns field state and client-side validation only; the actual API write is delegated to the `useRecordOfflinePayment` composable. On success it emits `recorded` so the parent page can reload the order.

## Key elements

- **`props.orderId: string`** — the order this form settles. The caller is responsible for only rendering the form while the order is still payable.
- **`emit('recorded')`** — single event fired after a successful write; the parent uses it to refetch order state.
- **`methods`** — `Object.values(RecordOfflinePaymentRequestMethod)`; note `card` is intentionally absent from this enum (card is the customer's own checkout path).
- **`schema` (zod)** — validates `method` (required enum), `reference` (≤ 120 chars, optional), `receivedAt` (optional date string).
- **`useStructureFormValidation`** — wires native form validity, per-field error display, revalidation on locale change, and an "on invalid" toast.
- **`useBlockingError`** — local blocked-state for server-level refusals that don't map to a specific field (e.g. order no longer payable, card charge still in flight). Surfaced via `<InlineErrorAlert>`.
- **`submitForm`** — validates, clears any prior blocking error, calls `recordOfflinePayment`, then either toasts success + resets fields + emits `recorded`, or routes errors to `applyServerErrors` (field-level) or `reportRecordError` (unmapped → blocking).
- **`receivedAt` conversion** — the date input yields `YYYY-MM-DD`; at submit time it is converted to a full ISO timestamp (`new Date(\`${receivedAt}T00:00\`).toISOString()`) to satisfy the API contract. If empty, it is omitted so the server defaults to "now."
- **`loading` (from payments store)** — shared flag that disables the submit button while any payments-store write is in flight.

## Relationships

- **`src/modules/payments/composables/use-record-offline-payment.ts`** — Provides `recordOfflinePayment`, the sole API call this form makes. The composable receives the `orderId` via a computed ref, so it tracks prop changes.
- **`src/modules/payments/store.ts`** — Source of the shared `loading` ref (via `storeToRefs`), keeping this form's submit button in sync with any other concurrent payment write in the panel.

## Notes

- The component does **not** guard against double-submission beyond the `loading` flag and the `useBlockingError` gate; a 409 (card charge already in flight) is expected to arrive as a server message and be surfaced as a blocking alert, not prevented client-side.
- `reference` is trimmed to `undefined` when empty so the field is omitted from the request body entirely.
- All visible text goes through `t(...)`; the form revalidates when `locale` changes (passed to `useStructureFormValidation` via `revalidateOn`).
- `data-test` attributes on every field and the submit button exist for E2E test targeting — do not rename.
- The `<form>` element uses `novalidate` because validation is handled by the zod schema + `useStructureFormValidation`, not by native HTML constraints.
