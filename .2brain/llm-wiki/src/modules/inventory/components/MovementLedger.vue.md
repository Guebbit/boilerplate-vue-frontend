---
source: src/modules/inventory/components/MovementLedger.vue
sha256: 4002dd00f046682933358dfe60cf7b9b3384fb47e040d542ac21e1e077113d6c
generated_at: 2026-10-02T15:09:01.129142+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/components/MovementLedger.vue

## Purpose

Renders the inventory movement ledger: a paginated, filterable table of stock transitions (newest-first) showing on-hand and reserved deltas per event, plus the "sweep" action that expires stale reservation holds. It exists as the read/audit surface for the inventory module's write history.

## Key elements

- **`movementHeaders`** – computed `CoreDataTableHeader[]`; defines columns (when, product, on-hand Δ, reserved Δ, reason, reference, note). The `product` column is synthetic (resolved from `productId` against the products catalogue, not a field on the row).
- **`productFilterOptions` / `reasonFilterOptions`** – computed option lists for the two filter selects; each includes a `{ value: null, … }` "all" row.
- **`useAnyFilterChoice`** – bridges the select's `null` model to the underlying `undefined` refs (`movementsProductId`, `movementsReason`) so an unselected filter means "no filter."
- **`useProductPicker` / `useProductPickerPin`** – search-backed product autocomplete (hits `POST /products/search`) rather than the unpaged products-store list; the pin keeps a `focusProduct`-set id displayable even when it isn't on the current search page.
- **`loadMovements`** – calls `inventoryStore.fetchMovements({ page, pageSize, productId, reason })`; triggered on mount and on any filter/page change via `watch`.
- **`focusProduct(productId)`** – exposed via `defineExpose`; sets the product filter and resets to page 1 (entry point for `StockBoard`'s history button).
- **`handleSweep`** – opens a Vuetify confirm dialog, then calls `inventoryStore.sweep()`; success shows a toast with the expired count, failure is captured by `useBlockingError` and rendered as an `InlineErrorAlert` above the table.
- **`signed` / `deltaClass`** – format helpers: `+n` / `-n` / `0` with color (green / red / muted) for the delta columns.
- **`orderTargetTo(reference)`** – resolves a movement's order reference to a router link via `linkIfRouted`, returning `undefined` when the `orders` module is absent so the cell renders plain text.
- **`PAGE_SIZE`** – fixed at 10; pagination total derived from `movementsTotal`.

## Relationships

- **`useInventoryStore`** (Pinia) – source of `movements`, `movementsTotal`, `loading`; target of `fetchMovements` and `sweep` writes.
- **`useProductsStore`** (Pinia) – provides `productsList` for resolving `productId → title` in the product column.
- **`useProductPicker` / `useProductPickerPin`** – composable pair that powers the product filter's search input and pins the selected id.
- **`useAnyFilterChoice`** – two-way mapping between the select's `null` sentinel and the component's `undefined` filter refs.
- **`useBlockingError`** – local reactive error channel for the sweep write; pairs with `InlineErrorAlert`.
- **`DataTable` / `ListPagination`** – UI organisms that render the table and page controls.
- **`useNotificationsStore`** (vue-toolkit) – toast dispatch for sweep success.
- **`useDialogStore`** – confirm-dialog prompt before the sweep fires.

## Notes

- Filter selects use `null` for the "all" row, **not** `undefined`. Vuetify interprets an `undefined` item value as "use the item's title as the posted value," which would send the translated label to the server. `useAnyFilterChoice` converts between the two representations.
- The product filter deliberately uses a **server-search** picker (`POST /products/search`) rather than the products store's `listProducts()`, because the store only ever holds the first page of results (tracked as FE_PARITY_0924 B2).
- `focusProduct` is the only exposed method; it is the contract `StockBoard` uses to deep-link into this tab.
- The sweep confirm dialog exists because the action cancels orders behind released holds—idempotent server-side, but consequential—so the UX demands a deliberate click rather than being "dangerous."
- The reference column link is guarded with `linkIfRouted` because `orders` is not declared in this module's `MODULE_EDGES`; in builds without it the cell degrades to plain text (FA86).
