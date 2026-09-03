# src/modules/inventory/components/MovementLedger.vue

## Purpose
Renders the inventory module's stock-movement ledger tab: a paginated, filterable table of every stock transition (newest-first) and the "Sweep" action that expires stale reservation holds. It owns its filter state locally and delegates all reads/writes to `useInventoryStore`.

## Key elements
- **`movementHeaders`** – Computed `CoreDataTableHeader<StockMovement>[]` for the seven ledger columns; the `product` column is marked `synthetic` because it is resolved from `productId` at render time, not read from a row field.
- **`loadMovements`** – Calls `inventoryStore.fetchMovements` with the current page, `PAGE_SIZE` (10), product, and reason filters. Triggered by `onMounted` and by a `watch` on the three filter refs.
- **`focusProduct(productId)`** – Sets the product filter and resets to page 1; exposed via `defineExpose` so the stock-board history button can jump to a specific product's ledger.
- **`handleSweep`** – Opens a warning confirm dialog, then calls `inventoryStore.sweep()`; on success shows a toast with the expired-count, on failure routes through `notifyErrorMessages`.
- **`signed` / `deltaClass`** – Small helpers that format a numeric delta with an explicit sign (`+3`, `-3`, `0`) and apply colour (`text-success` / `text-error` / `opacity-50`).
- **`productTitle`** – Resolves a `productId` to its catalogue title via `productsList` from `useProductsStore`, falling back to the raw id.
- **`productFilterOptions` / `reasonFilterOptions`** – Computed arrays (with an "All" row) feeding the two `v-select` filters.

## Relationships
- **`src/infrastructure/utils/logger.ts`** – Listed as a graph neighbor, but no direct import or call to `logger` is visible in this file's source. (The error path uses `notifyErrorMessages` from `@/infrastructure/utils/errors.ts` instead.)

## Notes
- Filters are **local refs**, not store state. Changing any of them fires the `watch` → `loadMovements` cycle; there is no `computed` shortcut.
- `PAGE_SIZE` is a module-level constant (10). Changing it requires editing this file.
- The `reference` column is expected to be an order id; the template links it to the `OrderTarget` route. If the backend ever stores a different entity id there, the link will break silently.
- `focusProduct` is the only public API (`defineExpose`). Parent components should call it via a template ref rather than reaching into internal refs.
- The sweep confirm uses `useDialogStore().confirm`, which returns a Promise<boolean>; the `.then` chain is the only control flow—there is no `if/else` branch.
