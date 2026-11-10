---
source: src/modules/inventory/components/StockBoard.vue
sha256: f893c98c451af3c84130418e5a3df4ed866ff5a3befd3ba398d60ca4c78f98cf
signature: 9e263610c281c643c164eaf517d92bd6d4cc37137aeede2ad302cc6d3a0001b5
generated_at: 2026-11-10T04:30:42.986019+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/components/StockBoard.vue

## Purpose

A tab-level table component that displays current shelf counts (on-hand, reserved, available, backorder limit, backordered) one row per product. It provides a "low only" filter, client-side pagination (10 rows), and a per-row action to open the backorder-limit editor. It is designed as a read-mostly admin view, not a data-entry surface.

## Key elements

- **`levelHeaders`** (computed) — Localized column definitions passed to `DataTable`; the final "history" column is synthetic (button cell, no data field).
- **`loadLevels()`** — Calls `inventoryStore.fetchLevels` with current page, `PAGE_SIZE` (10), and optional `lowOnly` flag; invoked on mount and whenever page or filter changes.
- **`lowOnly`** (computed get/set) — Boolean switch model backed by the `filters` ref; `undefined`/absent means off.
- **`editLimit(level)`** — Sets `limitRow` and `limitOpen`, triggering `BackorderLimitDialog` to render.
- **`emit('history', productId)`** — Informs the parent view that the ledger below should jump to the named product.
- **`syncUrl`** (from `useListUrlState`) — Keeps `levels-page` and `levels-lowOnly` in the URL so the board state survives navigation without colliding with the ledger's own `movements-*` keys.
- **`onAmbientError`** (from `useAmbientError`) — Toasts fetch failures; there is no form-level inline error slot here.
- **`rowActionSize`** (from `useTouchFriendlySize`) — Switches button density between `small` and default based on viewport for WCAG touch-target compliance.

## Relationships

- **`src/modules/inventory/store.ts`** — Consumes `useInventoryStore`; reads `levels`, `levelsTotal`, `loading` via `storeToRefs` and calls `fetchLevels` for data.
- **`src/modules/inventory/components/BackorderLimitDialog.vue`** — Conditionally rendered (`v-if="limitRow"`) as a child dialog for editing a single row's backorder limit.
- **`src/modules/inventory/views/InventoryLedger.vue`** — Parent view that listens for the `history` emit and navigates its own table to the specified product.
- **`src/modules/inventory/tests/stock-board.spec.ts`** — Unit/integration tests covering this component's rendering, filter, pagination, and emit behavior.

## Notes

- The plain `<script>` block exists solely to export `name: 'StockBoard'`, which `<script setup>` cannot declare; it is required for `<KeepAlive>` matching and DevTools display.
- The backorder-limit edit button is gated by `session.can('update', 'StockLevel')`, so read-only roles (e.g. manager) see the number but no gear icon.
- URL-state keys are prefixed `levels-` (not a bare name) to avoid clobbering the `movements-*` keys used by the ledger tab on the same screen.
- `PAGE_SIZE` is deliberately 10 — this is a small admin table, not a scrollable feed.
- `watch([levelsPage, lowOnly], …)` triggers the data fetch; `watch(lowOnly, syncUrl)` is a *separate* watcher so URL sync does not depend on the fetch completing.
