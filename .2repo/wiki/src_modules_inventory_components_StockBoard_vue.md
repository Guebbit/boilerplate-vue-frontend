# src/modules/inventory/components/StockBoard.vue

## Purpose
A read-only admin table tab that displays current shelf counts (on-hand, reserved, available) per product. Supports filtering to low-availability items and client-side pagination. Designed as a glance-at table, not a scrollable feed.

## Key elements
- **`levelHeaders`** (computed) — Localized `CoreDataTableHeader[]` for the DataTable; re-translates on locale change. The `history` column is marked `synthetic: true` and has no backing field.
- **`lowOnly`** (ref, default `false`) — When true, narrows results to products at or under the server's low-availability threshold. Passed as `undefined` (not `false`) to the store call when off.
- **`levelsPage` / `levelsPageTotal`** — Current page ref and computed page count (ceil of total / `PAGE_SIZE`).
- **`loadLevels()`** — Calls `inventoryStore.fetchLevels({ page, pageSize, lowOnly })`. Triggered on mount and on any change to `levelsPage` or `lowOnly`.
- **`PAGE_SIZE`** — Constant `10`; intentionally small for an admin table.
- **`emit('history', productId)`** — Fired when a row's history button is clicked; the parent view is responsible for navigating the ledger.
- **`DataTable`** — Renders the rows; `available` column gets a bold slot override; `history` column renders a text `v-btn`.
- **`ListPagination`** — Bound to `levelsPage`, capped at `levelsPageTotal`.

## Relationships
No graph-neighbor files are documented for this component. It pulls data exclusively from `useInventoryStore` (via `storeToRefs`) and communicates upward only through the `history` emit to its parent view.

## Notes
- The component is purely presentational for its data: it never mutates inventory state, only reads and fetches.
- The `history` column header has an empty `title` string; it exists solely to host the per-row button.
- `lowOnly` is passed as `lowOnly.value || undefined`, so the store never receives an explicit `false`—only `true` or omission.
- The `v-if="levels.length > 0"` guard on DataTable means an empty board hides the table entirely (pagination still renders).
