---
source: src/modules/products/views/ProductsList.vue
sha256: 60ddc086627b40e005a72192b370cc0915fa708a55f272580d640a6e13c22112
generated_at: 2026-10-02T15:42:06.621614+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/views/ProductsList.vue

## Purpose

The main products list page. It renders two distinct experiences from one component: a public storefront grid (image cards with price, availability, add-to-cart) for any visitor, and a staff admin table with row actions (edit, soft-delete, restore, hard-delete) for users holding at least one Product write permission. Both views share a search/filter form, facet chips (category, tag), server-side sorting, and URL-synced pagination.

## Key elements

- **`isStaff`** (computed) — checks `session.can('create'|'update'|'delete', 'Product')`; drives the grid-vs-table split and visibility of admin-only filters.
- **`activeOptions` / `deletedOptions`** — admin-only filter dropdowns ("Active", "Deleted"). The "all" row in `activeOptions` uses `null` (not `undefined`) to avoid a Vuetify quirk.
- **`activeChoice` / `deletedChoice`** — `useAnyFilterChoice` wrappers that map the `null` "any" UI value to an absent filter key.
- **`tableHeaders`** (computed) — column definitions for the staff `DataTable`; `image` and `actions` are marked `synthetic` so they are non-sortable.
- **`sortableKeys` / `sortChoice`** — server-side sort via `useServerSort`; options are a subset of the `ProductSort` enum (price, title, asc/desc).
- **`syncUrl`** — `useListUrlState` keeps filters, page, and page-size in the query string for deep-linkable views.
- **`handleSearch` / `handleReset`** — from `useListSearch`; both restart pagination and sync the URL.
- **`handleCategoryChip` / `handleTagChip`** — toggle a single facet chip on/off and re-search from page 1.
- **`handleDelete`** — soft-delete behind a `useDialogStore` confirm; failure surfaces via `reportRowActionError`.
- **`handleRestore`** — undo soft-delete (no confirm); re-runs `search(true)` because the active filter may no longer match.
- **`handleHardDelete`** — permanent delete behind a confirm dialog; same error path as soft-delete.
- **`rowActionError` / `reportRowActionError` / `clearRowActionError`** — one shared `useBlockingError` instance for all row-action mutations; rendered as an `InlineErrorAlert` above the table.
- **`onMounted(fetchFacets)`** — loads facet chips once on page mount.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — No direct import or call is visible in this file's source. The adjacency is likely indirect (e.g., a shared store or composable logs internally); no interaction to document from this file's perspective.
- **`src/modules/payments/components/OrderReferenceSearch.vue`** — No import or reference visible here. The graph link is probably transitive (shared UI molecules or store patterns); no direct interaction to document.

## Notes

- **`null` vs `undefined` in `activeOptions`:** The "all" row value is `null`. Vuetify treats an `undefined` option value as "use the title as the value," which would POST the translated label instead of clearing the filter.
- **Error-channel split:** Row-action failures (delete / restore / hard-delete) use the blocking `InlineErrorAlert` (table stays interactive). Search failures use toast notifications via `notifyErrorMessages` (ambient, list just hasn't refreshed).
- **`image` column is `synthetic`:** Even though `imageUrl` is a real field, it's marked synthetic to prevent a "sort by image URL" control that serves no purpose.
- **Restore re-fetches the list:** After `handleRestore` succeeds, `search(true)` is called because the current `active` filter (if set to `true`) would no longer include the restored row.
- **Permission granularity:** `isStaff` is true if *any* of the three Product write permissions exists; a role that can edit but not delete still gets the full admin table.
