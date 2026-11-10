---
source: src/modules/payments/components/AwaitingTransfersTable.vue
sha256: 34cfb96531abffc2c9e8d1b736ca823cef20665e2df69d9bf14164056ac1ff7d
signature: cfc7f6fecf7109d47687a0bd92cb1b0a0bb36aec56ce6a4b8b7e67192667a758
generated_at: 2026-11-10T05:07:18.951304+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/AwaitingTransfersTable.vue

## Purpose

Renders the "Awaiting transfer" tab of the payments list: bank-transfer payments still owed to the merchant, ordered by `payBy` deadline (server-sorted). Selecting a row emits the payment upward so the parent can open its detail drawer.

## Key elements

- **`export default { name: 'AwaitingTransfersTable' }`** — separate `<script>` block that gives the SFC a stable name for devtools and `<KeepAlive>` (not possible inside `<script setup>`).
- **`usePagedTable(awaitingTotal, …)`** — returns `page` / `pageTotal`; invokes `store.fetchAwaitingPage(pageNumber, pageSize)` on mount and page change.
- **`useRowSelect(awaitingPage, …)`** — tracks the currently selected row id; on pick, emits `select` with the `Payment` and then clears the selection so the drawer can reopen.
- **`headers` (computed)** — five column definitions (`payBy`, `reference`, `amount`, `orderNumber`, `email`); all marked `synthetic: true` because rendering is done in scoped slots and the server controls sort order.
- **`orderLink`** — from `useOrderLink`; returns a route path for an order id, or nothing when the `orders` module is absent from the build.
- **`emit('select', payment)`** — the sole emit; consumed by the parent view to open the payment drawer.
- **Template slots** — `payBy` and `reference` are read from `item.nextAction?.…`; `amount` is formatted via `formatCurrency`; `orderNumber` conditionally renders a `<router-link>` when `orderLink` resolves.

## Relationships

- **`store.ts`** — source of `awaitingPage`, `awaitingTotal`, `loading` (via `storeToRefs`) and the `fetchAwaitingPage` action.
- **`use-paged-table.ts`** — supplies the `page`/`pageTotal` reactive pair and the fetch-on-change lifecycle.
- **`use-row-select.ts`** — encapsulates row-selection state and the "emit-then-forget" callback pattern.
- **`PaymentsList.vue`** — parent view that mounts this component as the "Awaiting" tab and listens for the `select` event to open the drawer.
- **`payments-tables.spec.ts`** — integration/unit tests that exercise this table's rendering, pagination, and row-selection behavior.

## Notes

- **No client-side sorting.** All headers are `synthetic: true`; the API (`GET /payments`) returns rows pre-sorted by `payBy`. Adding a sort key would require a server change.
- **Optional `nextAction`.** `payBy` and `reference` live under `item.nextAction?.…` and fall back to `EMPTY_VALUE` when absent.
- **Conditional order link.** `useOrderLink` may return nothing in builds that don't ship the `orders` module; the template then falls back to a plain `<span>`.
- **`@click.stop` on the order link** prevents the row-selection handler from firing when a user clicks the order link.
