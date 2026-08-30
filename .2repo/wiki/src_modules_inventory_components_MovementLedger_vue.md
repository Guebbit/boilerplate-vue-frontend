# src/modules/inventory/components/MovementLedger.vue

## Purpose

Admin-facing tab that lists every stock transition (newest-first) in a paginated, filterable table, and hosts the "sweep" button that expires stale reservation holds. All reads/writes go through `useInventoryStore`; filters are local refs that trigger a re-fetch via a `watch`.

## Key elements

- **`movementHeaders`** — computed array of localized `CoreDataTableHeader<StockMovement>` columns; the `product` column is marked `synthetic` (title resolved from the products catalogue, not from the row).
- **`movementsPage` / `movementsProductId` / `movementsReason`** — local `ref`s driving pagination and the two `v-select` filters; a single `watch` on all three calls `loadMovements()`.
- **`loadMovements()`** — calls `inventoryStore.fetchMovements` with current page, `PAGE_SIZE` (10), and active filters.
- **`focusProduct(productId)`** — exposed via `defineExpose`; sets the product filter and resets to page 1 so a parent (e.g. the stock board) can deep-link into one product's history.
- **`handleSweep()`** — opens a warning-level confirm dialog, then calls `inventoryStore.sweep()`; reports the count of expired holds via the notifications store and surfaces errors with `notifyErrorMessages`.
- **`signed(delta)` / `deltaClass(delta)`** — render deltas as `+n`/`-n`/`0` and color them success/error/muted respectively.
- **`productTitle(productId)`** — resolves a product id to its title from `productsStore.productsList`, falling back to the raw id.
- **Template slots** — custom cell renderers for `createdAt`, `product`, `onHandDelta`, `reservedDelta`, `reason` (chip), `reference` (router-link to `OrderTarget`), and `note`.

## Relationships

- The dependency-graph neighbor `src/infrastructure/utils/logger.ts` has **no visible direct import or call** in this file. Error reporting is delegated to `notifyErrorMessages` from `@/infrastructure/utils/errors.ts`; user-facing feedback goes through `useNotificationsStore`.

## Notes

- `PAGE_SIZE` is hard-coded to 10 by design ("admin table to read, not a feed to scroll").
- The `product` column is **synthetic**: the `StockMovement` row carries `productId`, and the title is looked up against the already-loaded products list. If the product is missing, the raw id is shown.
- The total-count badge (`movementsTotal`) reflects the **server-side match count**, not the rows on the current page — this is intentional to avoid implying the ledger is complete when only one page is loaded.
- `reference` values are order ids and render as `router-link`s to the `OrderTarget` route; empty references render as `EMPTY_VALUE`.
- `handleSweep` is idempotent server-side but **cancels the orders** behind the released holds, which is why a confirm dialog is required.
