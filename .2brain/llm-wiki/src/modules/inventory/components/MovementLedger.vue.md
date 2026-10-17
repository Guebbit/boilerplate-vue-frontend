---
source: src/modules/inventory/components/MovementLedger.vue
sha256: e9f15a332c377617616fa6e51b70b1774e377c04394ce7de9fcd8c202d516f40
generated_at: 2026-10-17T00:57:26.014035+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/components/MovementLedger.vue

## Purpose
Renders the "movement ledger" tab of the inventory screen: a paginated, filterable table of stock transitions (newest-first) and a **sweep** button that expires stale reservation holds. All reads/writes go through `useInventoryStore`; filters are local refs synced to the URL.

## Key elements

- **`focusProduct(productId)`** — Exposed via `defineExpose`. Sets the product filter and resets to page 1; called by the parent stock board's "history" button.
- **`handleSweep()`** — Opens a confirm dialog, then calls `inventoryStore.sweep()`. Success → toast; failure → inline alert via `useBlockingError` (not a toast, since the dialog is already closed).
- **`loadMovements()`** — Calls `inventoryStore.fetchMovements` with current page, `PAGE_SIZE` (10), and active filters. Triggered on mount and on filter/page change.
- **`loadMissingTitles(rows)`** — Batch-fetches product titles for rows whose `productId` is not yet in the local dictionary (`loadProducts`); runs via `watch(movements, …, { immediate: true })`.
- **`movementHeaders`** — Computed `CoreDataTableHeader<StockMovement>[]` defining the eight columns (when, product, on-hand Δ, reserved Δ, preordered Δ, reason, reference, note).
- **`productFilterOptions` / `reasonFilterOptions`** — Filter dropdowns with a leading "all" row whose value is `null` (not `undefined`) to avoid a Vuetify quirk.
- **`signed(delta)` / `deltaClass(delta)`** — Format and colour delta cells (`+3` green, `-3` red, `0` muted).
- **`productTitle(productId)`** — Resolves id → catalogue title; falls back to the raw id if the product is missing from the dictionary.
- **URL state** — `useListUrlState` with prefix `movements` keeps filter/page params in the query string without colliding with the stock board's `levels-*` keys.

## Relationships

- **`src/modules/inventory/store.ts`** — Primary data source: `movements`, `movementsTotal`, `loading` (via `storeToRefs`); writes via `fetchMovements` and `sweep`.
- **`src/modules/inventory/composables/use-product-picker.ts`** — Provides the search-backed product autocomplete (`useProductPicker`) and pins the currently selected product id so it stays displayable even when absent from the active search page (`useProductPickerPin`).
- **`src/modules/inventory/views/InventoryLedger.vue`** — Parent view that mounts this component and calls the exposed `focusProduct` method from the stock board's per-product history button.
- **`src/modules/inventory/tests/movement-ledger.spec.ts`** — Unit/integration tests for this component.

## Notes

- Component `name` is declared in a **separate** non-`setup` `<script>` block — required because `<script setup>` cannot set its own name.
- The product filter intentionally uses `POST /products/search` (paged, via `useProductPicker`) rather than the products store's unpaged `listProducts()`, which only holds the first page.
- Filter "all" rows use value `null`, **not** `undefined`: Vuetify's `v-autocomplete` treats an `undefined` item value as "use the title string," which would post the translated label as the filter value.
- The `reference` column's link to an order page is guarded by `linkIfRouted` / `hasRoute` — the `orders` module is optional in the dependency graph, so the link degrades to plain text when absent.
- Sweep is idempotent server-side; the confirm dialog gates *intent* (released holds cancel their orders), not danger.
