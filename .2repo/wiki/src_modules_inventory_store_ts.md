# src/modules/inventory/store.ts

## Purpose
Pinia store for the inventory domain. Exposes two paginated reads (stock-movement ledger, shelf-count board) and three writes (receive, adjust, sweep) over the structure REST API. All writes reload the views they touched before resolving, so callers never observe a counter the views have not caught up with. No client-side arithmetic on counts is performed.

## Key elements

- **`useInventoryStore`** – the exported Pinia setup store (`'inventory'`).
- **`loading`** – shared boolean from `useStructureRestApi`, surfaced for UI spinners.
- **`movements` / `movementsTotal`** – current page of `StockMovement[]` and the cross-page count.
- **`levels` / `levelsTotal`** – current page of `InventoryLevel[]` (shelf counts, most scarce first) and the cross-page count.
- **`fetchMovements(query?)`** – loads a ledger page. Omitting `query` repeats the last one (used for post-write reloads).
- **`fetchLevels(query?)`** – loads a board page; supports `lowOnly` filter. Same "repeat last query" behavior.
- **`receive(productId, quantity, note?)`** – records a delivery (strictly positive quantity), then reloads both views.
- **`adjust(productId, delta, note?)`** – applies a signed stocktake correction (negative = shrinkage), then reloads both views.
- **`sweep()`** – expires stale reservations (idempotent; the API ships no scheduler, so this store is the tick driver), then reloads both views.
- **`reloadAfterWrite(level?)`** – internal helper that chains `fetchMovements` → `fetchLevels` sequentially and resolves with the write's returned counters. Not exported from the store.

## Relationships
No graph-neighbor files are documented for this module. Its runtime dependencies are `@guebbit/vue-toolkit` (`useCoreStore`, `useStructureRestApi`) and `@api` (the five inventory endpoints).

## Notes

- **Sequential reload order is deliberate.** Movements (the ledger) are fetched before levels (the board) so the board never appears without the movement that justifies it.
- **`available` is server-derived.** It is computed from `onHand − reserved` on the API side; duplicating that subtraction client-side is a bug.
- **`movementsQuery` / `levelsQuery` are module-private** (not returned from the store) and exist solely so a post-write reload repeats the page/filters the user is viewing.
- **`sweep` is the "outside" scheduler.** There is no cron or worker in the API; this store (or another caller) is expected to invoke it periodically. Running it twice is safe—nothing new is released.
- **`meta.totalItems` is preserved on both reads** because both lists are server-paginated; a bare `.length` would underreport, especially for the audit ledger.
