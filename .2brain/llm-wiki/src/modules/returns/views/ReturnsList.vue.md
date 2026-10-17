---
source: src/modules/returns/views/ReturnsList.vue
sha256: 801bd58856a925dd4da258b09f88f38c93e79934c3c8ef765909516dfe7bef2d
generated_at: 2026-10-17T01:39:37.101739+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/views/ReturnsList.vue

## Purpose

The paginated returns list page. It renders a filter form (status, reason, page size), a card-per-return listing, and pagination controls. The same component serves both customers (who see only their own returns) and staff (who see all); the scoping decision is made server-side via the shared store query.

## Key elements

- **`<script>` (default export)** — Sets `name: 'ReturnsListPage'` so devtools and `<KeepAlive>` can identify the component (not possible inside `<script setup>`).
- **`statusOptions` / `reasonOptions` (computed)** — Build Vuetify select items from the `ReturnStatus` / `ReturnReason` enums, prepending an "any" entry whose value is `null`.
- **`statusChoice` / `reasonChoice`** — Models from `useAnyFilterChoice` that bridge the `null` "any" value to the store's filter fields (`filters.value.status`, `filters.value.reason`).
- **`syncUrl` (from `useListUrlState`)** — Serialises filters + page + pageSize into the URL so deep links and reloads restore the view.
- **`search` (from `watchSearchReturns`)** — Reactive query bound to the store; failures dispatch a toast via `notifyErrorMessages`.
- **`handleSearch` / `handleReset` (from `useListSearch`)** — Apply or clear filters, reset to page 1, and re-sync the URL.
- **`isFiltered` (computed)** — Detects whether any filter is active to pick the correct empty-state copy.
- **Template** — Vuetify `v-card` form with two `v-select`s + `PageSizeSelect`; `v-empty-state` when no rows; a loop of `v-card` items showing reason, order number, date, status chip, and an "Open" button linking to `ReturnTarget`; `ListPagination` at the bottom.

## Relationships

- **`src/modules/returns/store.ts`** — Source of all reactive state (`filters`, `pageItemList`, `pageCurrent`, `pageSize`, `pageTotal`, `loading`) via `storeToRefs`, and the async `watchSearchReturns` action that executes the paginated query.

## Notes

- The "any" filter option uses `value: null` (not `undefined`) because Vuetify interprets an `undefined` item value as "use the title as the value."
- The page is intentionally role-agnostic; no client-side permission check distinguishes customer from staff views.
- `routerLinkI18n` is used for the per-item "Open" link to keep locale-prefixed routes correct.
- The `data-test` attributes (`filter-status`, `search-submit`, `return-item`, `return-open`, etc.) are the hooks for E2E/Cypress selectors.
