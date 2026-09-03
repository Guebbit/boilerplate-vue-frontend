# src/modules/products/views/ProductsList.vue

## Purpose
Public products listing page. Provides a search/filter form (text, ID, price range), category and tag facet chips, a paginated data table of products, and admin-gated row actions (edit, soft delete, hard delete). Mounted under `LayoutDefault`.

## Key elements

- **`ProductsListPage`** — SFC default export (name + `<script setup>`).
- **`tableHeaders`** (computed) — Localized column definitions for the `DataTable`; `image` and `actions` columns are marked `synthetic` (no direct field sort).
- **`pageItems`** (computed) — Filters sparse `undefined` holes out of the toolkit's pagination array before handing rows to the table.
- **`handleSearch`** — Resets `pageCurrent` to 1 and delegates to the store's `search()` action.
- **`handleReset`** — Clears all filters, resets page, calls `search(true)`.
- **`handleCategoryChip` / `handleTagChip`** — Toggle a single facet filter value on/off, then re-trigger search.
- **`handleDelete` / `handleHardDelete`** — Prompt `confirm()`, call the store's `deleteProduct` / `hardDeleteProduct`, and toast the result.
- **`pageSizeOptions`** — `[10, 25, 50]` choices bound to the `v-select` in the filter form.
- **`rowActionSize`** — From `useTouchFriendlySize()`; makes row-action buttons larger below the `sm` breakpoint for WCAG touch-target compliance.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — No direct import in this file. The error-reporting path runs through `@/infrastructure/utils/errors.ts` (`notifyErrorMessages`) and the `@guebbit/vue-toolkit` notifications store; any logging side-effects are encapsulated there.

## Notes

- **Sparse pagination array.** `pageItemList` from the toolkit contains `undefined` holes for out-of-range slots. The `pageItems` computed must filter them; the eslint disable is load-bearing—don't remove it.
- **`synthetic` on `image`.** `imageUrl` *is* a real product field, but the column is marked `synthetic` to suppress a useless "sort by URL" affordance.
- **`confirm()` dialogs.** Delete confirmations use the native blocking `confirm()` rather than a Vuetify dialog—this is intentional (simpler, no extra component state) but means the page briefly blocks the JS thread.
- **Facet chips accessibility.** Each `v-chip` carries `role="button"` and `aria-pressed` so screen readers announce selected state; the visual color alone is not sufficient.
- **Admin gating.** The "Create product" button and row actions (edit/delete) are rendered only when `isAdmin` (from the session store) is true; non-admins see a read-only table.
