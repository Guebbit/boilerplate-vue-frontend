---
source: src/modules/payments/components/RefundsTable.vue
sha256: 687e45983152da837d6e4d6c14563d05f4f339b141f6ee72b13397a130112192
generated_at: 2026-10-17T01:22:42.666205+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/RefundsTable.vue

## Purpose

Read-only refunds table for the "Refunds" tab of the payments list. Displays one row per refund across all payments (newest first) with filterable status, reason, order ID, and creation date range. Refunds are never mutated here—they are settled on their parent payment.

## Key elements

- **`load()`** — Fetches the current page from the store via `fetchRefundsPage`, passing filters and 1-based page number; catches errors and dispatches an ambient toast.
- **`handleSearch` / `handleReset`** — Apply or clear filters and reset to page 1.
- **`filters`** (`ref<RefundFilters>`) — Local reactive state for status, reason, orderId, and date-range inputs.
- **`page` / `pageTotal`** — Current page (1-based) and computed total page count (fixed `PAGE_SIZE = 10`).
- **`statusOptions` / `reasonOptions`** — Computed select-option lists built from `RefundStatus` / `RefundReason` enums with an "any" (`null`) entry, rendered through `useAnyFilterChoice`.
- **`headers`** — Column definitions for the `DataTable` (date, amount, status, reason, settled, provider ref, order).
- **`orderLink(orderId)`** — Returns a localized route path to the order detail, or `undefined` if the `orders` module is absent from the build (guarded via `linkIfRouted`).
- **`STATUS_COLORS`** — Maps each `RefundStatus` to a chip color; typed with `satisfies Record<TRefundStatus, string>` so adding a new enum value breaks the build.
- **`<script>` (non-setup) block** — Declares the component `name: 'RefundsTable'` for `<KeepAlive>` / devtools, since `<script setup>` cannot set it.

## Relationships

- **`src/modules/payments/store.ts`** — Consumed via `usePaymentsStore()`; provides the reactive refs `refundsPage`, `refundsTotal`, `loading` and the `fetchRefundsPage` action.
- **`src/modules/payments/views/PaymentsList.vue`** — Parent view that mounts this component as the "Refunds" tab.
- **`src/modules/payments/tests/payments-tables.spec.ts`** — Integration/unit spec covering this table's rendering, filters, and pagination.

## Notes

- `failureReason` shown under the status chip is a **closed server enum** (staff-visible). The raw provider error text never reaches the client; it lives only in server logs.
- Date-range filters are converted to instants at the edges of the day (`startOfDayInstant` / `endOfDayInstant`) before being sent, so a user picking "2025-01-15" covers the full UTC day.
- The order column is marked `synthetic: true` in the headers array, meaning the `DataTable` does not derive it from a flat item key—it is rendered entirely through the scoped slot.
- `orderLink` returns `undefined` (rendering a plain `<span>`) when the `orders` route is not registered, supporting builds that omit that module.
- The empty-state (`v-empty-state`) is shown only when `refundsPage` is empty **and** loading is false, to avoid a flash before the first fetch resolves.
