# src/modules/inventory/components/StockBoard.vue

## Purpose
Read-only admin table that lists current shelf counts (on-hand, reserved, available) for each product. It reads from the shared inventory Pinia store, supports a "low availability only" filter, and delegates navigation-to-ledger to its parent via an emitted event.

## Key elements
- **`levelHeaders`** — computed array of `CoreDataTableHeader<InventoryLevel>` producing the localized column definitions (product, on-hand, reserved, available, history). The history column is marked `synthetic: true` because its cell is a button, not a data field.
- **`lowOnly`** — `ref(false)` toggle that, when on, narrows the query to products at or under the server's low-availability threshold.
- **`levelsPage` / `levelsPageTotal`** — pagination state; page size is a hardcoded `PAGE_SIZE = 10`.
- **`loadLevels()`** — calls `inventoryStore.fetchLevels({ page, pageSize, lowOnly })`. Triggered on mount and via a `watch` on `[levelsPage, lowOnly]`.
- **`emit('history', productId)`** — the row's history button emits the product ID; the parent view is responsible for scrolling/jumping the ledger below to that product.
- **`rowActionSize`** — from `useTouchFriendlySize()`, returns `small` on desktop and Vuetify's default (larger) size below the `sm` breakpoint for WCAG touch-target compliance.
- **`storeToRefs(inventoryStore)`** — destructures `levels`, `levelsTotal`, and `loading` reactively from the store.

## Relationships
No graph neighbors are recorded for this file. It consumes `useInventoryStore` (Pinia) and imports `DataTable`, `ListPagination`, and `useTouchFriendlySize` from the shared UI layer, but those are not listed as graph neighbors here.

## Notes
- The component intentionally does **not** navigate or scroll the ledger itself; it only emits `history` and trusts the parent to act.
- The "history" column has an empty `title` and `synthetic: true` — it renders a button cell, so do not expect a sortable header.
- `PAGE_SIZE` is a local constant (10), not pulled from a config; it's documented as intentionally small ("admin table to read, not a feed to scroll").
- The `lowOnly` value is passed as `undefined` (not `false`) to the store fetch when the toggle is off, likely so the backend can distinguish "no filter" from an explicit value.
- Component name is declared in a separate non-setup `<script>` block alongside `<script setup>` — a Vite/Vue convention for DevTools naming.
