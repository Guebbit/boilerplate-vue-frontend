---
source: src/modules/returns/views/ReturnsList.vue
sha256: 3e14d473febe56501810120ab61292959139ec633c34780a89d3350e969e91f0
signature: 916352c18fa125b2cc29406656a8497ce7d5ce76703b50162088a7e721372b44
generated_at: 2026-11-10T05:41:49.637065+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/views/ReturnsList.vue

## Purpose

The returns list page. It renders a filterable, paginated table of product returns by wiring the `ReturnsStore`'s search action to a filter form (status, reason), a page-size selector, and a pagination control. The page is role-agnostic: the server decides which returns a customer vs. a staff member can see, so the UI is identical for both.

## Key elements

- **`ReturnsListPage`** — component name (declared in the non-setup `<script>` block) for devtools / `<KeepAlive>`.
- **`statusOptions` / `reasonOptions`** — computed arrays of select choices, each prefixed with a `null`-valued "any" entry.
- **`statusChoice` / `reasonChoice`** — `useAnyFilterChoice` wrappers that map the select model (`null`) to the store's filter fields (`undefined`).
- **`isFiltered`** — computed flag that switches the empty-state copy between "no results" and "no data".
- **`syncUrl`** — from `useListUrlState`; keeps `filters`, `pageCurrent`, and `pageSize` in the query string for deep-linking and reload persistence.
- **`search`** — obtained by calling the store's `watchSearchReturns` action with an `onError` handler that fires a toast via `useNotificationsStore`.
- **`handleSearch` / `handleReset`** — from `useListSearch`; both reset to page 1 and re-sync the URL.
- **Template** — a Vuetify `v-card` form (two `v-select` + `PageSizeSelect`), a `ListEmptyState` for zero rows, a card per return item (reason, order number, date, status chip, "Open" button → `ReturnTarget` route), and `ListPagination`.

## Relationships

- **`src/modules/returns/store.ts`** — the sole data dependency. The page pulls `watchSearchReturns` (action) and `filters`, `pageItemList`, `pageCurrent`, `pageSize`, `pageTotal`, `loading` (state) via `storeToRefs`. All search, filter, and pagination logic lives in the store; this component only drives the UI.

## Notes

- The "any" filter entry uses `value: null`, **not** `undefined`. Vuetify interprets an `undefined` item value as "display the title as the value", which would break the select. The `useAnyFilterChoice` composable bridges `null` (UI) ↔ `undefined` (store filter key absent).
- The page intentionally contains no role/permission checks. Authorization is enforced server-side; adding client-side branching here would be a bug.
- Each row's "Open" button navigates to the `ReturnTarget` route using `routerLinkI18n`, which resolves the i18n-prefixed path.
- `data-test` attributes (`filter-status`, `filter-reason`, `return-item`, `return-open`) are the stable hooks for e2e tests.
