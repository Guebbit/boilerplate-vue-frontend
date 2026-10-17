---
source: src/modules/inventory/components/StockBoard.vue
sha256: e3f27cfc9387a5d18cd1068267583ed89035d1f388e4b547a7cfa25d420fb40e
generated_at: 2026-10-17T00:58:14.910299+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/components/StockBoard.vue

## Purpose
Renders the "Stock Board" tab of the inventory page: a paginated, filterable table of per-product shelf counts (on-hand, reserved, available, preorder limit, preordered). It owns its own data-fetching via the inventory store and emits a `history` event so the parent view can jump the ledger tab to a product.

## Key elements
- **`levelHeaders`** (computed) – Localized column definitions for the DataTable; re-evaluates on locale change.
- **`loadLevels`** – Calls `inventoryStore.fetchLevels` with the current page, fixed `PAGE_SIZE = 10`, and the optional `lowOnly` flag. Triggered on mount and via a `watch` on `[levelsPage, lowOnly]`.
- **`lowOnly`** (computed get/set) – Wraps the single boolean filter in a `filters` ref so it plays nicely with `useListUrlState`.
- **`syncUrl`** (from `useListUrlState`) – Persists `lowOnly` and `levelsPage` into the URL under the `levels-` prefix, keeping them separate from the ledger's `movements-` keys.
- **`editLimit` / `limitRow` / `limitOpen`** – Opens the `PreorderLimitDialog` for the clicked row.
- **`emit('history', productId)`** – Fired by each row's history button; the parent view is responsible for navigating the ledger.
- **`rowActionSize`** (from `useTouchFriendlySize`) – Selects `small` vs. default button size so touch targets meet WCAG on smaller screens.

## Relationships
- **`src/modules/inventory/store.ts`** – Reads `levels`, `levelsTotal`, `loading` via `storeToRefs`; calls `fetchLevels` to populate the table.
- **`src/modules/inventory/components/PreorderLimitDialog.vue`** – Rendered conditionally (`v-if="limitRow"`) to let a manager edit a single product's preorder limit; receives `level` and a `v-model` for open/closed.
- **`src/modules/inventory/views/InventoryLedger.vue`** – Parent view; listens for the `history` emit and scrolls/filters its own ledger tab to the named product.
- **`src/modules/inventory/tests/stock-board.spec.ts`** – Unit/integration tests for this component.

## Notes
- Two `<script>` blocks are intentional: the plain block sets `name: 'StockBoard'` for `<KeepAlive>` and devtools, since `<script setup>` cannot declare a component name.
- `PAGE_SIZE` is hard-coded to 10 by design (small admin table, not a scrollable feed).
- The preorder-limit edit button is gated on `session.can('create', 'StockMovement')`; read-only managers see the number but no edit affordance.
- URL-state prefix is `levels` (e.g. `levels-page`, `levels-lowOnly`) to avoid colliding with the ledger's `movements-*` keys on the same page.
- The history column is marked `synthetic: true` in the header array because it renders only a button with no data binding.
