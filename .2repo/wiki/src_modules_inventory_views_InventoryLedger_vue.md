# src/modules/inventory/views/InventoryLedger.vue

## Purpose

The inventory admin page. It composes the stock board (current per-product counts) and the movement ledger (full history) on a single screen so that a write (receipt or adjustment) is immediately visible in both. It owns two small coordination duties: fetching the shared product catalogue once for all children, and forwarding the board's `history` click to the ledger's `focusProduct` method.

## Key elements

- **`movementLedger` ref** — template ref on `<MovementLedger>` so the page can call its exposed `focusProduct(productId)` in response to the board's `@history` emit.
- **`productsStore` / `productsList`** — calls `useProductsStore()` and destructures `productsList` via `storeToRefs`. On mount, fetches products if the list is empty, so the three children (two `StockMovementForm` selects and the ledger's filter/column) share one fetch rather than racing.
- **`StockMovementForm` (×2)** — one with `mode="receipt"`, one with `mode="adjust"`; rendered side-by-side in a two-column grid.
- **`StockBoard`** — displays current stock; emits `history` with a product id when the user clicks a product.
- **`MovementLedger`** — lists all stock movements newest-first; exposes a `focusProduct` method (called via the ref above).
- **`LayoutDefault`** — standard app shell; page title sourced from i18n key `inventory-page.page-title`.

## Relationships

No graph neighbors are recorded for this file. At runtime it interacts with:

- `useInventoryStore` (Pinia) — read directly by `StockBoard` and `MovementLedger`; this page does not touch it.
- `useProductsStore` (Pinia, `@/modules/products`) — fetched here, consumed by children.
- `StockBoard` / `MovementLedger` / `StockMovementForm` — child components rendered in the template.

## Notes

- **No local aggregation.** `available` stock is derived server-side; this page (and its children) never recompute it, avoiding a second source of truth.
- **Reactivity is child-to-child, not page-mediated.** Both board and ledger read the same Pinia store, so a write propagates between them without the page wiring any props or events beyond the `history` → `focusProduct` call.
- **Products fetch is guard-conditional** (`if length === 0`) so a hot-reload or re-mount does not duplicate the request.
