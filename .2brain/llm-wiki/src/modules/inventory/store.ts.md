---
source: src/modules/inventory/store.ts
sha256: 6d8db7cfe6e01a20895235efe9da29a6e4e8a66c8eac686e0109d7ba73b4f0e8
generated_at: 2026-10-17T00:59:34.990109+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/store.ts

## Purpose

Pinia setup store for the inventory domain. It exposes two paginated reads (stock-movement ledger, stock-level board), one whole-list read (preorder allowances), and four writes (receive, adjust, set-preorder-limit, sweep). All writes reload the views they touched before resolving, so callers never observe a counter the views have not caught up with. A single shared `loading` flag and `fetchAny` runner (from `useStructureRestApi`) governs every request.

## Key elements

- **`useInventoryStore`** — the store itself (`defineStore('inventory', …)`); the sole export.
- **State refs** — `movements` / `movementsTotal`, `levels` / `levelsTotal`, `preorderLevels`: the last-fetched rows and their server-side totals.
- **`fetchMovements(query?)`** — loads one page of the ledger; reuses the last query when called without args (used by post-write reloads).
- **`fetchLevels(query?)`** — loads one page of the stock board, most-scarce-first; supports `lowOnly` filter.
- **`fetchPreorderLevels()`** — recursively pages through *all* preorder rows (`MAX_PAGE_SIZE = 100` per page) into a single array.
- **`receive(productId, quantity, note?)`** — records a delivery; strictly positive quantity; idempotent via `receiptIdempotencyKey`.
- **`adjust(productId, delta, note?)`** — stocktake correction; signed delta (negative = shrinkage); idempotent via `adjustmentIdempotencyKey`.
- **`setLimit(productId, preorderLimit)`** — sets an absolute preorder allowance (0 closes); no idempotency key needed (idempotent by nature); reloads the board.
- **`sweep()`** — expires all stale reservations; idempotent; reloads both ledger and board.
- **`reloadAfterWrite(level?)`** — sequential `fetchMovements().then(fetchLevels()).then(() => level)`; shared by `receive` and `adjust`.
- **`movementsQuery` / `levelsQuery`** (module-level `let`) — remember the last filter so a bare reload fetches the page the user is still viewing.

## Relationships

- **Vue components** consume the store: `StockBoard.vue` (levels, `fetchLevels`, `setLimit`), `MovementLedger.vue` (movements, `fetchMovements`), `StockMovementForm.vue` (`receive`, `adjust`), `PreorderLimitDialog.vue` / `PreorderProductsTable.vue` (preorderLevels, `setLimit`), `OpeningStockField.vue` (levels).
- **Tests** cover the store and its consumers: `store.spec.ts`, `stock-board.spec.ts`, `movement-ledger.spec.ts`, `stock-movement-form.spec.ts`, `preorder-limit-dialog.spec.ts`, `opening-stock-field.spec.ts`.
- **Dependencies imported**: `useStructureRestApi` + `queryClient` (shared request/loading infra), `useIdempotencyKey` (retry-safe headers), API functions from `@api`, type definitions from `@types`.

## Notes

- **No local arithmetic on counts.** `available` is derived server-side from `onHand − reserved`; the store deliberately never recomputes it.
- **Idempotency is selective.** Only `receive` and `adjust` carry `Idempotency-Key` headers (a retried delta or quantity would double-count). `sweep` is structurally idempotent; `setLimit` is absolute.
- **Sequential, not concurrent, reloads.** `reloadAfterWrite` fetches the ledger *then* the board so the board never renders a counter its justifying movement row hasn't arrived with yet.
- **`meta.totalItems` is preserved** on both paginated reads; a bare `items.length` would misreport a partial page as the full history.
- **`fetchPreorderLevels` is the only multi-page read.** It exists because the board joins preorder rows to delivery counts by product, and the list is short (one row per product ever preordered).
- **`movementsQuery` / `levelsQuery` are plain `let`, not `ref`.** They are internal bookkeeping, not reactive state exposed to components.
