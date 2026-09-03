# src/modules/inventory/store.ts

## Purpose

Pinia store (`'inventory'`) that owns the two reads (stock board, movement ledger) and three writes (receive, adjust, sweep) for the inventory domain. Every write reloads the affected views before resolving so callers never see a counter the views haven't caught up with.

## Key elements

- **`useInventoryStore`** – the exported `defineStore('inventory', …)` setup store; the only export.
- **`fetchMovements(query?)`** – loads one page of the stock-movement ledger. Omitted `query` re-runs the last query (used by post-write reloads).
- **`fetchLevels(query?)`** – loads one page of the stock board (most-scarce-first). Supports a `lowOnly` filter.
- **`receive(productId, quantity, note?)`** – records a delivery (strictly positive quantity), then reloads both views.
- **`adjust(productId, delta, note?)`** – records a stocktake correction; `delta` is **signed** (negative = shrinkage). API rejects anything that would push `onHand` below `reserved`.
- **`sweep()`** – expires stale reservations (idempotent). Driven externally; no server-side scheduler.
- **`reloadAfterWrite(level)`** – internal helper; runs `fetchMovements` then `fetchLevels` sequentially, returns the counters.
- **`loading`** – shared reactive flag from `useStructureRestApi`; true while any request in this store is in flight.
- **`movements` / `movementsTotal` / `levels` / `levelsTotal`** – reactive state; `*Total` comes from the paginated response's `meta.totalItems`.

## Relationships

No external graph neighbors are recorded for this file. Internally it depends on:

- `@guebbit/vue-toolkit` → `useCoreStore` (app-wide loading registry) and `useStructureRestApi` (request runner + shared loading flag).
- `@api` → `listInventoryLevels`, `listStockMovements`, `receiveStock`, `adjustStock`, `sweepReservations`.
- `@types` → `InventoryLevel`, `StockMovement`, `ListInventoryLevelsParams`, `ListStockMovementsParams`.

## Notes

- **No local arithmetic on counts.** `available` is derived server-side from `onHand` and `reserved`; this store never re-implements that subtraction.
- **Sequential, not concurrent, post-write reloads.** Movements are fetched before levels so the ledger "explains" the board; a board arriving before its justifying movement would read as a number nobody wrote.
- **`movementsQuery` / `levelsQuery` are module-scoped `let`s**, not refs — they exist solely so a post-write reload can re-issue the exact page/filter the user was looking at. They are not exposed to consumers.
- **`sweep` chains `fetchMovements().then(fetchLevels)`** rather than calling `reloadAfterWrite`, because the sweep response carries `expired` (a count) rather than an `InventoryLevel` row.
- Both reads preserve `meta.totalItems` from the paginated response; do not replace with `items.length` — the ledger is the audit record and a bare row count would misreport history as complete.
