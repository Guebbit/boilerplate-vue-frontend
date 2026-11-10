---
source: src/modules/inventory/store.ts
sha256: 7ee92910beb8cc7975ada451acdd255e67001574f96e5e183e27edd874e65e3c
signature: e79f5f02332601d814ae48bd4d00f5a01b3e0e992043869b7c71e0898f15346f
generated_at: 2026-11-10T04:32:25.132884+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/store.ts

## Purpose

Pinia store for the inventory domain. It owns the client-side state for the stock board (levels), the movement ledger, and preorder allowances, and exposes the three stock-mutation actions (receive, adjust, sweep) plus the preorder-limit setter. All reads and writes go through a shared `useStructureRestApi` loader, and every write reloads the views it affected before resolving so callers never see a counter that disagrees with what's rendered.

## Key elements

- **`useInventoryStore`** – the store itself (id: `'inventory'`), created via `defineStore` with setup syntax.
- **`loading`** – shared boolean flag from `useStructureRestApi`; every action in the store sets it.
- **`movements` / `movementsTotal`** – the current page of stock-movement rows and the server-side total.
- **`levels` / `levelsTotal`** – the current page of inventory-level rows (one per product) and the server-side total.
- **`preorderLevels`** – full (multi-page) list of preorder allowances; loaded all-at-once because the board joins against it.
- **`fetchMovements(query?)`** – loads one ledger page; reuses the last query if none is passed.
- **`fetchLevels(query?)`** – loads one stock-board page (most scarce first); supports `lowOnly` filter.
- **`fetchPreorderLevels()`** – paginates through all preorder rows recursively until the last page.
- **`setLimit(productId, backorderLimit)`** – sets the backorder allowance (or clears it with `0`/`null`), then reloads levels.
- **`receive(productId, quantity, note?)`** – records a stock delivery (strictly positive); uses per-product idempotency keys.
- **`adjust(productId, delta, note?)`** – applies a signed stocktake correction; uses per-product idempotency keys.
- **`sweep()`** – expires stale reservations server-side; idempotent; returns the count of released holds.
- **`reloadAfterWrite(level)`** – internal helper that sequentially re-fetches movements then levels, resolving with the original response.
- **`receiptIdempotencyKeys` / `adjustmentIdempotencyKeys`** – per-product `Idempotency-Key` keepers so a network retry replays rather than double-counts.
- **`MAX_PAGE_SIZE`** – derived from the generated API schema constant; used as the page size for the preorder fetch.

## Relationships

- **`StockBoard.vue`** – reads `levels`, `levelsTotal`, `preorderLevels`, `loading`; calls `fetchLevels`, `fetchPreorderLevels`, `setLimit`.
- **`MovementLedger.vue`** – reads `movements`, `movementsTotal`, `loading`; calls `fetchMovements`.
- **`StockMovementForm.vue`** – calls `receive` or `adjust` depending on the selected action.
- **`BackorderLimitDialog.vue`** – calls `setLimit` to persist a new allowance.
- **`PreorderProductsTable.vue`** – reads `preorderLevels` for the outstanding-vs-limit breakdown.
- **`OpeningStockField.vue`** – reads a product's current level from `levels` to pre-populate a starting count.
- **`store.spec.ts`** – unit-tests the store's fetch, write, and reload-sequencing logic.
- **`movement-ledger.spec.ts`**, **`stock-board.spec.ts`**, **`stock-movement-form.spec.ts`**, **`backorder-limit-dialog.spec.ts`**, **`opening-stock-field.spec.ts`** – component tests that mock or spy on this store's exposed state and actions.

## Notes

- No client-side arithmetic is ever performed on `onHand`, `reserved`, or `available`. The store trusts the server's returned counters verbatim; a local re-derivation would be a second source of error.
- `reloadAfterWrite` runs `fetchMovements` then `fetchLevels` **sequentially** (not with `Promise.all`), deliberately, so the ledger row that justifies a new board number is already in memory before the board re-renders.
- `fetchPreorderLevels` is the only read that fetches **all** pages (recursive). The other two reads are single-page. This is an intentional trade-off: the board needs the full set for a join, and the list is bounded by "products ever sold as preorder."
- Idempotency keys are per-product (per "subject"), not per-call. A retry after a network fault resends the same key; a *new* user action for the same product within the key's validity window would also replay. Callers are expected to treat the UI as a single-in-flight action per product.
- `sweep` has no idempotency key because the API endpoint is itself idempotent (a second call releases nothing new). It does, however, reload **both** views since released holds affect `reserved` and therefore the board.
- The store keeps the last `movementsQuery` / `levelsQuery` in a closure (not reactive state) purely so a post-write reload repeats the user's current page/filters.
