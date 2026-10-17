---
source: src/modules/products/views/ProductsList.vue
sha256: 625e12ef16b10af1a4c60dfdf876376076f54275fc574f2d0f70c66a3b02f8ca
generated_at: 2026-10-17T01:36:24.885297+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/views/ProductsList.vue

## Purpose

The main products list page. It renders two views from the same data: a shopper-facing grid of `ProductCard` components (image, price, availability, add-to-cart) and a staff-facing `DataTable` with row actions (edit, soft-delete, restore, hard-delete). Both include a search/filter form, facet chips, server-side sorting, and pagination. The split is on *what the viewer may do* (any single write permission on `Product`), not on authentication.

## Key elements

- **`isStaff` (computed)** — true if the session has *any* of `create`, `update`, or `delete` on `Product`; gates the table view and the admin-only filters (Active, Purchasable, Deleted).
- **`handleSearch`** — applies filters via `applySearch`, then reports the search to the analytics relay (`trackBrowsing`). Sort changes and paging call `applySearch` alone (they refine, not initiate, a search).
- **`applySearch` / `handleReset`** — from `useListSearch`; reset returns to page 1 and re-syncs the URL.
- **`handleCategoryChip` / `handleTagChip`** — toggle a single facet value (selecting the active chip clears it) and re-run the search from page 1.
- **`handleDelete`** — opens a `useDialogStore().confirm` dialog, then calls `deleteProduct`. Failure is surfaced via `useBlockingError` (inline alert), not a toast.
- **`tableHeaders`** — localised `CoreDataTableHeader<Product>[]` for the staff table; `image` and `actions` are `synthetic: true`.
- **`useServerSort` / `sortOptions`** — sort state lives in `filters.sort` so it travels in the URL and the API request. Shopper options are a subset of the `ProductSort` enum.
- **`useListUrlState`** — keeps filters, page, and page-size in the URL for deep-linking and reload fidelity.
- **`activeOptions` / `purchasableOptions` / `deletedOptions`** — admin-only filter selects. Each "all" row uses `value: null` (not `undefined`) to avoid Vuetify posting the translated label.
- **`useAnyFilterChoice`** — maps the `null` "all" sentinel to `undefined` (no filter) on the store's `filters` object.
- **`useBlockingError` (`rowActionError`)** — shared between delete and hard-delete; renders an inline alert above the table. Distinct from the toast-based `notifyErrorMessages` used for search failures.

## Relationships

- **`src/modules/products/store.ts`** — Pinia store (`useProductsStore`). Provides reactive state (`filters`, `pageItemList`, `facets`, `loading`, etc.) via `storeToRefs` and all mutation actions (`watchSearchProducts`, `deleteProduct`, `hardDeleteProduct`, `restoreProduct`, `fetchFacets`).
- **`src/modules/products/components/ProductCard.vue`** — Imported and rendered inside the shopper-facing grid (one card per product in `pageItemList`).
- **`src/modules/products/tests/products-list-view.spec.ts`** — Unit/integration test suite that exercises this view's rendering, filters, and row actions.

## Notes

- **`null` vs `undefined` in filter selects:** Vuetify interprets an `undefined` item value as "use the label string," which would POST the translated text instead of omitting the filter. All "all" options therefore use `value: null`.
- **`synthetic: true` on the image column:** `imageUrl` is a real field, but the cell renders an image, not a URL string, and URL-sorting is meaningless to the user.
- **Dual script blocks:** The `export default { name: 'ProductsListPage' }` block is required because `<script setup>` cannot declare a component name; it keeps the component stable for `<KeepAlive>` and DevTools.
- **Analytics is search-only:** `trackBrowsing` fires in `handleSearch` (initial apply), not in `applySearch` (sort/page changes), to avoid double-reporting.
- **Row-action errors vs. search errors:** Delete/hard-delete failures use `useBlockingError` (inline, blocks the list); search failures use `notifyErrorMessages` (toast, the table simply shows stale data). See `docs/theory/request-flow.md` for the distinction.
