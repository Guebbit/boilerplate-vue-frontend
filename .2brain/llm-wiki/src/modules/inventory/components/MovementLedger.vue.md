---
source: src/modules/inventory/components/MovementLedger.vue
sha256: f61134668634332557184418e2ffa9d023055c5ef303f302e0fd9b6d5adb4505
signature: f61134668634332557184418e2ffa9d023055c5ef303f302e0fd9b6d5adb4505
generated_at: 2026-11-10T04:29:58.207943+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/components/MovementLedger.vue

## Purpose

Renders the "Movement Ledger" tab: a paginated, filterable table of all stock transitions (newest-first) showing product, on-hand/reserved/backorder deltas, reason, and reference. Also hosts the **sweep** action that expires stale reservation holds, since that write targets the same ledger.

## Key elements

- **`movementHeaders`** (computed) – Localized column definitions for the `DataTable`; the `product` column is `synthetic: true` because the title is looked up, not read from the row.
- **`filters` / `movementsProductId` / `movementsReason`** – Local reactive filter state. `movementsProductId` and `movementsReason` are writable computed properties that patch `filters`.
- **`useListUrlState`** – Persists filters and page into the URL under the `movements-` prefix (distinct from the stock board's `levels-` keys on the same screen).
- **`useProductPicker` / `useProductPickerPin`** – Powers the search-backed product filter dropdown. The pin ensures a programmatically-set product id (e.g. from `focusProduct`) remains displayable even if it isn't in the current search results.
- **`productFilterChoice` / `reasonFilterChoice`** (`useAnyFilterChoice`) – Bridge between the `null`-valued "All" row in the dropdown and the `undefined` value the filter logic expects.
- **`loadMissingTitles`** (watched on `movements`) – Batch-fetches product titles for ids not yet in the catalogue dictionary; failures are silently swallowed (ids remain as fallback).
- **`loadMovements`** – Calls `inventoryStore.fetchMovements` with current page/filters; triggered by a `watch` on page + filters.
- **`focusProduct(productId)`** – Exposed via `defineExpose`; sets the product filter and resets to page 1 so the parent board can jump into a product's history.
- **`handleSweep`** – Wrapped in `singleFlight`; asks `dialogStore.confirm`, then calls `inventoryStore.sweep()`. Gated by the `sweep:StockLevel` session permission. Errors render as an inline `InlineErrorAlert` via `useBlockingError`.
- **`DELTA_CLASSES` / `deltaClass` / `signed`** – Color-coding and sign formatting for the numeric delta cells.
- **`useOrderLink`** – Resolves a movement's `reference` to an order-page route when applicable.
- **`PAGE_SIZE = 10`** – Deliberately small; this is an admin reference table, not a feed.

## Relationships

- **`src/modules/inventory/store.ts`** – Primary data source: `fetchMovements` (read), `sweep` (write), and reactive refs `movements`, `movementsTotal`, `loading` consumed via `storeToRefs`.
- **`src/modules/inventory/composables/use-product-picker.ts`** – Provides the search-backed product dropdown (`query`, `options`, `pin`) used by the product filter.
- **`src/modules/inventory/views/InventoryLedger.vue`** – Parent view that embeds this component and calls the exposed `focusProduct` method when the user clicks a product's history link on the stock board.
- **`src/modules/inventory/tests/movement-ledger.spec.ts`** – Unit/integration tests exercising this component's filters, sweep flow, and pagination.

## Notes

- The component declares its name in a separate `<script>` block because `<script setup>` cannot set `name`; this is required for `<KeepAlive>` and devtools identification.
- The "All" rows in both filter dropdowns use `value: null` rather than `undefined` because Vuetify interprets `undefined` as "use the item's title as the value," which would post a translated label instead of clearing the filter.
- `sweep` is idempotent server-side; the confirm dialog exists to signal intent (releasing holds cancels associated orders), not to warn of destructiveness.
- The sweep button is hidden for roles that lack the `sweep:StockLevel` permission; warehouse and manager roles can still read the ledger.
- Tailwind class strings live in a top-level `DELTA_CLASSES` const (not inline) so the Tailwind content scanner picks them up.
