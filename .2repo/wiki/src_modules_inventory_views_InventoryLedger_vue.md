# src/modules/inventory/views/InventoryLedger.vue

## Purpose
Admin inventory page that composes `StockBoard` and `MovementLedger` on a single screen so a stock write is visible in both simultaneously. It owns no business logic; its only job is to fetch the shared product catalogue once (avoiding three racing first-fetches from child components) and to forward the board's `history` emit to the ledger's `focusProduct` method.

## Key elements
- **`productsStore` / `productsList`** — Instantiates `useProductsStore()` and reads `productsList` via `storeToRefs`. On mount, calls `fetchProducts()` only if the list is still empty, acting as a single guard for all three children that consume the catalogue.
- **`movementLedger` (ref)** — Template ref to the `MovementLedger` component instance; used exclusively to call its exposed `focusProduct(productId)` when `StockBoard` emits `history`.
- **Template** — Renders `LayoutDefault` with two `StockMovementForm` instances (modes `"receipt"` and `"adjust"`), then `StockBoard`, then `MovementLedger`. The only inter-child wiring is `@history` → `movementLedger?.focusProduct`.

## Relationships
No graph neighbors are registered. The page interacts only with its imported child components and the `useProductsStore` Pinia store; all cross-child reactivity (writes propagating from board to ledger and vice-versa) flows through the shared `useInventoryStore()` that the children read directly—no prop drilling or event bubbling through this page is involved.

## Notes
- `available` stock is computed server-side; this page intentionally performs no local arithmetic on stock columns to avoid a second source of truth that could disagree with the API.
- The board and ledger are kept on one screen by design (no tabs) so a single write is observable in both at once; do not split them into separate routes without re-evaluating that interaction model.
- The component name in the options `<script>` block is `InventoryLedgerPage`; the `<script setup>` block carries all runtime logic.
