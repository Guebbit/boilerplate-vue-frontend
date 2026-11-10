---
source: src/modules/products/views/ProductsList.vue
sha256: 448df59c37586e6220dd9f7672e3491de230569b46f61075bb8246855a07bb64
signature: 448df59c37586e6220dd9f7672e3491de230569b46f61075bb8246855a07bb64
generated_at: 2026-11-10T05:35:11.288190+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/views/ProductsList.vue

## Purpose
Single view that renders the product catalogue for two audiences behind one route: shoppers see a card grid (image, price, availability, add-to-cart) while staff see a data table with row actions (edit, soft-delete, restore, hard-delete). It owns the search/filter form, facet chips, server-side sorting, pagination, and URL state so deep links reproduce the current view.

## Key elements
- **`ProductsListPage`** (named default export) — stable component name for `<KeepAlive>` / devtools.
- **`isStaff`** (computed) — true if the session has *any* Product write permission (create, update, or delete); gates the table layout, admin-only filters, and row actions.
- **`handleSearch`** — applies filters via `useListSearch`, then fires an analytics `products_searched` event (gated by consent).
- **`applySearch` / `handleReset`** — from `useListSearch`; reset page to 1, call the store's `watchSearchProducts`, and sync the URL.
- **`handleCategoryChip` / `handleTagChip`** — toggle a single facet value on/off and re-run the search.
- **`tableHeaders`** (computed) — localized `CoreDataTableHeader<Product>[]` for the staff DataTable; `image` and `actions` columns are marked `synthetic`.
- **`sortOptions` / `sortChoice` / `sortBy`** — server-side sort driven by the `ProductSortItem` enum; shopper select and staff table column headers both write into `filters.sort`.
- **`activeOptions` / `purchasableOptions` / `deletedOptions`** — admin-only filter selects; the "all" row uses `value: null` (not `undefined`) so Vuetify posts no filter.
- **`purchasableChoice` / `activeChoice` / `deletedChoice`** — `useAnyFilterChoice` wrappers mapping `null ↔ undefined` between the UI model and the store's `filters` object.
- **`syncUrl`** (`useListUrlState`) — serializes filters, page, page-size, and sort into query params for shareable/reloadable URLs.
- **`rowActionError` / `reportRowActionError`** (`useBlockingError`) — shared blocking-alert state for delete/hard-delete mutations; search failures use a separate toast path.
- **`run` / `runConfirmed`** (`useRowActions`) — execute or confirm-then-execute store actions (`deleteProduct`, `hardDeleteProduct`, `restoreProduct`).
- **`onMounted(fetchFacets)`** — loads category/tag facet data once on mount.
- **`rowActionSize` / `facetChipSize`** (`useTouchFriendlySize` / `useTouchChipSize`) — responsive button sizes for WCAG touch targets.

## Relationships
- **`src/modules/products/store.ts`** — source of all reactive state (`filters`, `pageItemList`, `pageCurrent`, `pageTotal`, `pageSize`, `loading`, `facets`, `selectedProductId`) and the async actions this view calls (`watchSearchProducts`, `deleteProduct`, `hardDeleteProduct`, `restoreProduct`, `fetchFacets`).
- **`src/modules/products/components/ProductCard.vue`** — imported and rendered as the cell component in the shopper's storefront grid.
- **`src/modules/products/tests/products-list-view.spec.ts`** — dedicated test suite covering this view's rendering and interaction logic.

## Notes
- The "all" option in `activeOptions` and `purchasableOptions` deliberately uses `value: null` rather than `undefined`; Vuetify interprets an `undefined` item value as "use the item's title string," which would post the translated label to the API instead of omitting the filter.
- Search errors are surfaced as toasts (`notifyErrorMessages` → `addMessage`); row-action errors (delete, hard-delete, restore) use a separate blocking alert (`useBlockingError`) because those are destructive confirm-dialog flows, not ambient refreshes.
- Sorting is always server-side (`filters.sort`); only columns whose keys appear in the `ProductSortItem` enum are sortable via `sortFieldsOf`.
- The component name is declared in a separate `<script>` block because `<script setup>` cannot export a `name` — required for `<KeepAlive>` matching.
- `trackBrowsing` is a no-op until the visitor has granted analytics consent (checked inside `useAnalyticsConsentStore`).
