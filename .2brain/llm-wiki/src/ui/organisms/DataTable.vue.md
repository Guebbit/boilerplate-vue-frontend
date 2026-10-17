---
source: src/ui/organisms/DataTable.vue
sha256: d7e6afc505104f732341541459a6c6eb99e25be921e65b16649c0db2bcb30a93
generated_at: 2026-10-17T01:58:19.073672+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/DataTable.vue

## Purpose

A generic (`T extends object`) wrapper around Vuetify's `v-data-table` that translates the app's `CoreDataTableHeader<T>` shape into Vuetify's expected format, provides optional single-row selection and sorting (both opt-in via bound `v-model`/`v-model:sort-by` listeners), swaps in the accessible `TableLoadingBar`, and forwards `header.*`/`item.*` slots from the calling view. Pagination is always server-side; the footer is hidden.

## Key elements

- **`defineProps`** — Accepts `headers`, `items`, `caption`, `itemValue`, `loading`, `loadingText`, `noDataText`, `rowTest`, and optional `serverSortKeys`. The `caption` prop feeds `aria-label` on the region wrapper for screen-reader identification. `rowTest` sets a `data-test` on every row (default `'list-row'`) so specs can disambiguate between two tables on one page.
- **`modelValue` (`defineModel<unknown>()`)** — Bound value for the selected row's `itemValue`; only meaningful when the parent supplies an `onUpdate:modelValue` listener.
- **`sortBy` (`defineModel('sortBy')`)** — Vuetify's `{ key, order }[]` sort state; only meaningful when the parent supplies an `onUpdate:sortBy` listener.
- **`isSelectable` (computed)** — Reads `vnodeProps` for `'onUpdate:modelValue'` to detect whether the caller actually bound the model. Uses `getCurrentInstance()?.vnode.props` rather than `useAttrs()` because Vue strips listeners for declared emits from `$attrs`.
- **`isSortable` (computed)** — Same detection trick for `'onUpdate:sortBy'`. Defaults to non-sortable so an unbound table never reorders its single page.
- **`customHeaders` (computed)** — Headers where the view provides a `header.{key}` slot; used to forward those slots selectively.
- **`vuetifyHeaders` (computed)** — Maps `CoreDataTableHeader` entries into Vuetify's shape. Disables `sortable` for `synthetic` columns. When `serverSortKeys` is set, only listed keys are sortable and a `sort: () => 0` comparator preserves server order.
- **`getValue`** — Reads an arbitrary property off a row via `Record<string, unknown>` cast.
- **`select` / `handleRowClick`** — Sets `modelValue` to the row's `itemValue` on click; guarded by `isSelectable`.
- **`rowProps`** — Returns per-row `<tr>` attributes: `bg-surface-variant` highlight, `data-test`, `tabindex="0"`, `aria-selected`, and a `keydown` handler (Enter/Space) for keyboard selection. Keydown is ignored when the event target is a child control.

## Relationships

- Imports `TableLoadingBar` from `@/ui/molecules/TableLoadingBar.vue` (replaces Vuetify's internal loader slot).
- Imports the `CoreDataTableHeader<T>` type from `@/ui/organisms/data-table-headers.ts` (the app's header definition consumed by this component).
- Consumed by pages/stores that own pagination state (`pageSize`, `pageCurrent`) and pass `serverSortKeys` for server-driven sort; no pagination logic lives here.

## Notes

- **Opt-in detection is listener-based, not value-based.** An unbound `defineModel` produces `undefined` just like a local ref, so the component inspects the vnode's `onUpdate:*` props. This is the reason `getCurrentInstance()?.vnode.props` is used instead of `useAttrs()`.
- **`mobile-breakpoint="sm"` is explicit.** Vuetify's `mobile` prop defaults to `false` (not `null`), so without this the app-wide display query would be ignored and the table would never collapse to its stacked layout below 600 px.
- **`items-per-page="-1"` + `hide-default-footer`.** Pagination is always external; the table renders all items it is handed and shows no footer controls.
- **`synthetic` columns** are excluded from sorting even when `isSortable` is true, because they carry no data field and a sort icon would be a dead control.
- **Slot forwarding is selective for headers.** Only headers with a matching `header.{key}` slot in the view are forwarded; this prevents replacing Vuetify's default header (and its sort icon) on every table. `item.*` slots are forwarded for all headers unconditionally to preserve the existing view API.
