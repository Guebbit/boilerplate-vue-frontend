---
source: src/modules/inventory/components/PreorderProductsTable.vue
sha256: 77807ae0ce306b226103564e84d8c30d6bdc64585ac969a5017f254fe890c1cb
generated_at: 2026-10-17T00:58:03.380728+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/components/PreorderProductsTable.vue

## Purpose

Renders the "products" tab of the preorder board: one row per product sold as a preorder, joining its inventory allowance (limit, outstanding, left) with its delivery-state counts (waiting, awaiting, allocated, shipped, cancelled, late). Acts as the entry point for the board, emitting a `showOrders` event to switch the parent to the fulfillment-orders tab.

## Key elements

- **`PreorderProductsTable`** (default export) — Named component block so `<script setup>` gets a stable name for devtools and `<KeepAlive>`.
- **`emit('showOrders', productId, title)`** — Tells the parent view to narrow the fulfillment-orders tab to a specific product.
- **`rows` (computed)** — Produces the full joined list via `preorderRows(preorderLevels, summaries)`, sorted worst-first.
- **`pageRows` / `page` / `pageTotal`** — Local client-side pagination (10 rows/page) over the in-memory list.
- **`load()`** — Fetches both halves (`inventoryStore.fetchPreorderLevels()` and `loadSummaries()` in parallel); toasts any failure via `notifyErrorMessages`.
- **`headers` (computed)** — Builds the `CoreDataTableHeader<PreorderRow>[]` with i18n titles.
- **`STATE_COUNTS` / `countsOf(row)`** — Maps the six delivery states to their i18n labels; filters to non-zero counts for the chip row.
- **`editLink(productId)`** — Returns a router-link to `ProductEdit` only if the viewer has `update:Product` permission **and** the route is registered; otherwise `undefined` (link hidden).

## Relationships

- **`src/modules/inventory/store.ts`** — Consumes `useInventoryStore` for `preorderLevels`, its `loading` flag, and `fetchPreorderLevels()`.
- **`src/modules/inventory/domain/index.ts`** (→ `preorder-rows.ts`) — Imports the `preorderRows` join function and the `PreorderRow` type.
- **`src/modules/inventory/views/PreordersBoard.vue`** — Parent view that mounts this component as the first tab and listens for the `showOrders` event to drive the second tab.
- **`src/modules/inventory/tests/preorder-products-table.spec.ts`** — Unit/spec tests targeting this component's rendering and interactions.

## Notes

- "Outstanding" (`level.preordered`) means units still owed, not total units sold; it decreases as stock is allocated. The sub-line splits it into `held` and `paid`.
- The release date is **read-only** here; the only mutation path is the product edit form (gated by permission + route existence). There is no preview of how a later date affects already-paid buyers.
- Pagination is purely client-side because both reads return the entire (assumed-short) list in one request.
- The `late` chip is rendered with `color="error"` for visual distinction from the other states.
- The `src/infrastructure/utils/logger.ts` file appears in the dependency graph but is **not** imported by this component; logging, if any, is handled upstream in the store or delivery composable.
