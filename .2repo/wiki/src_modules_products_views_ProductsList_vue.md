# src/modules/products/views/ProductsList.vue

## Purpose

The public products list page. It renders a search/filter form, toggleable category and tag facet chips, and a paginated data table of products. Admin users additionally see per-row edit, soft-delete, and hard-delete actions plus a "Create product" button.

## Key elements

- **`handleSearch` / `handleReset`** — apply or clear the reactive `filters` object and call `watchSearchProducts` (a Pinia store action that fetches the page). Both reset `pageCurrent` to 1.
- **`handleCategoryChip(name)` / `handleTagChip(name)`** — toggle a single facet value on/off, then delegate to `handleSearch`.
- **`tableHeaders`** (computed) — localized `CoreDataTableHeader<Product>[]`; re-evaluated on locale change.
- **`pageItems`** (computed) — filters out `undefined` holes from the toolkit's sparse pagination array before handing rows to `DataTable`.
- **`handleDelete` / `handleHardDelete`** — confirm-then-mutate flows (soft vs. hard) reporting results via the notifications store.
- **`onMounted(fetchFacets)`** — loads category/tag counts once on mount; chips are hidden until data arrives.
- **`pageSizeOptions`** — fixed `[10, 25, 50]` choices bound to the page-size `<v-select>`.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — reached indirectly through `notifyErrorMessages` (`@/infrastructure/utils/errors.ts`) and the `@guebbit/vue-toolkit` notifications store; all error toasts on this page flow through that chain.
- **`tests/e2e/specs/keyboard.cy.ts`** — the `data-test` attributes (`facet-chips`, `category-chip`, `tag-chip`, `filter-text`, `create-product`, `row-view`) and the `role="button"` / `aria-pressed` on chips exist so that E2E keyboard-navigation specs can assert focus order and state announcements on this page.

## Notes

- The `pageItemList` array is **sparse** by design in the toolkit; `pageItems` filters out `undefined` slots. An `eslint-disable` comment suppresses the "unnecessary condition" rule because the runtime holes are real regardless of the declared element type.
- The `image` column is marked `synthetic: true` even though `imageUrl` exists on the model — it renders a `<LazyImage>` and intentionally omits sorting.
- Facet chips use `role="button"` + `aria-pressed` to make the selected state announced to screen readers; Vuetify's `<v-chip>` alone does not set these.
- The file was truncated in the source; the actions column likely contains the edit (navigates to a detail/edit route), soft-delete, and hard-delete buttons, all gated behind `isAdmin`.
