---
source: src/modules/payments/components/AttentionList.vue
sha256: 6a681aecf8ea41621cc9ed98b499e8141390f33305c1799879f577868d4f02eb
signature: bc10e99d0f6eba4c86531d4867c38e9af4e0f2821bf8da0922baf78f63720a8c
generated_at: 2026-11-10T05:06:57.916963+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/AttentionList.vue

## Purpose

The "Needs attention" tab in the payments module. It displays payment problems (failed refunds, open disputes, overdue pay-backs) that are still recorded on a document, so a fixed one disappears on the next read. It is deliberately read-only for most problem types: it surfaces the issue and links to the order page where the real actions live. For manual refunds it opens the `PaymentDrawer`; for amount mismatches it points to the audit log instead.

## Key elements

- **`load()`** — Calls `store.fetchAttention()`, toasts any failure via `notifyErrorMessages`. Invoked on mount and by the reload button.
- **`openPayment(paymentId)`** — Reads a single payment by ID from the store, then sets `picked` and opens the drawer.
- **`handleChanged(payment?)`** — Emits back from `PaymentDrawer` after a mutation; updates `picked` in place and re-calls `load()`.
- **`rows`** (computed) — Maps `attention` items to add a synthetic `rowKey` (kind + orderId + refund/dispute id + index) because no single field is unique.
- **`headers`** (computed) — Column definitions for the `DataTable`: problem kind, since, amount, order.
- **`deadlineOf(item)`** — Calculates days remaining (or overdue) for `refundDueBy` (legal pay-back, CRD Art. 13) or `dueBy` (dispute evidence). Returns `{ overdue, text }` or `undefined`.
- **`picked` / `drawerOpen`** — Reactive state controlling the `PaymentDrawer` instance.
- **`orderLink`** (from `useOrderLink`) / **`auditLink`** (computed) — Resolve to a route or `undefined` when the target page is not included in the current build.

## Relationships

- **`src/modules/payments/store.ts`** — Consumes `usePaymentsStore` for `fetchAttention`, `readPayment`, and the reactive refs `attention` / `loading`.
- **`src/modules/payments/components/PaymentDrawer.vue`** — Rendered inside this component; receives the `picked` payment, emits `@changed` to trigger a re-read.
- **`src/modules/payments/views/PaymentsList.vue`** — Parent view that mounts this component as the "Needs attention" tab.
- **`src/modules/payments/tests/payments-tables.spec.ts`** — Integration tests that render and assert on this table's rows and interactions.

## Notes

- The component declares its `name` in a separate non-setup `<script>` block because `<script setup>` cannot set one; this is required for `<KeepAlive>` and devtools identification.
- `rowKey` is a composite string including the array index; this is a practical uniqueness hack, not a domain key.
- The day-count in `deadlineOf` is computed client-side against `Date.now()`, so it changes every day without a server round-trip. The server only sends the absolute date.
- `deadlineOf` is called twice in the template (once in `v-if`, once for the text). At current scale this is negligible, but it means the translation lookup and date math run twice per rendered row.
- Amount mismatches are explicitly excluded from this list by design; they are audit-log rows, not stored payment state. The audit note at the bottom of the template makes this visible to the user.
