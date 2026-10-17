---
source: src/modules/payments/components/AttentionList.vue
sha256: fe7f0de55b9b8175b4e3251ef6ef6f23ec312f3567c14d31370dcc2adb7c0e61
generated_at: 2026-10-17T01:20:56.482887+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/AttentionList.vue

## Purpose

Renders the "Needs attention" tab inside the payments list view. It is a strictly read-only table of problems *currently* recorded on payment documents (a fixed problem disappears on the next read). It shows the problem kind, since-date, amount, and a link to the order page where existing remediation actions live. It performs no mutations of its own.

## Key elements

- **`load()`** – Calls `store.fetchAttention()`; on failure, dispatches a toast via `notifyErrorMessages` + `useNotificationsStore().addMessage`. Invoked in `onMounted` and by the reload button.
- **`rows` (computed)** – Spreads each attention item and appends a composite `rowKey` (`kind-orderId-refundId-index`) because no single field is unique.
- **`headers` (computed)** – Builds the four `CoreDataTableHeader` entries (problem, since, amount, order) using i18n titles.
- **`orderLink(orderId)`** – Resolves a router path to the order detail page via `linkIfRouted('OrderTarget', …)`; returns `undefined` when the orders module is not part of this build.
- **`auditLink` (computed)** – Resolves the audit-log route the same way; always `undefined` when absent.
- **Dual `<script>` blocks** – The plain block sets the component `name: 'AttentionList'` (required for `<KeepAlive>` / devtools alongside `<script setup>`).
- **Template** – A hint paragraph, a reload `v-btn`, a `v-empty-state`, a `DataTable` with per-column scoped slots (kind + optional `failureReason`, formatted date, formatted currency, conditional `router-link` for orderId), and a trailing audit-log note with optional link.

## Relationships

- **`src/modules/payments/store.ts`** – Consumes `usePaymentsStore`; reads the `attention` and `loading` refs via `storeToRefs`; triggers `store.fetchAttention()`.
- **`src/modules/payments/views/PaymentsList.vue`** – Parent view that mounts this component as the attention tab.
- **`src/modules/payments/tests/payments-tables.spec.ts`** – Integration/unit tests that locate elements through the `data-test` attributes defined here (`payments-attention`, `attention-reload`, `attention-row`, `attention-kind`, `attention-failure-reason`, `attention-order-link`, `attention-audit-note`).

## Notes

- **No mutation surface.** The component never calls a store setter or dispatches a mutation; it only reads and links out.
- **Amount mismatches are intentionally absent.** They are audit-log rows, not persisted "attention" state, so the tab points users to the audit log (the `auditLink` note) rather than listing them.
- **Graceful route degradation.** Both `orderLink` and `auditLink` return `undefined` when the target module isn't included in the build; the template falls back to plain text in that case.
- **`rowKey` is a local concern.** It exists solely to satisfy `DataTable`'s `item-value` requirement; it is not part of the store's data shape.
- **Error handling is ambient.** A failed fetch does not set an error banner; it fires a toast and leaves the previous (possibly empty) list in place.
