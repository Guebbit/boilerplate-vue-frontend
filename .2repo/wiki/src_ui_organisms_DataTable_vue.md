# src/ui/organisms/DataTable.vue

## Purpose
A thin, generic wrapper around Vuetify's `v-data-table` that adapts this app's `CoreDataTableHeader<T>` shape to Vuetify's expectations, adds opt-in single-row selection via `v-model`, swaps in the accessible `TableLoadingBar`, and selectively forwards `header.*` / `item.*` slots. It exists so views never touch Vuetify's table API directly and so selection, a11y naming, and test hooks stay consistent across the app.

## Key elements
- **`defineProps`** – Accepts `headers`, `items`, `caption` (used as `aria-label` on the wrapping region), `itemValue`, `loading`, `loadingText`, `noDataText`, and `rowTest` (a `data-test` attribute for every `<tr>`; defaults to `"list-row"`).
- **`modelValue = defineModel<unknown>()`** – The selected row's `itemValue`. Only active when the parent binds `v-model`.
- **`isSelectable` (computed)** – Detects whether the parent actually passed an `onUpdate:modelValue` listener by reading `getCurrentInstance().vnode.props`. This deliberately avoids `useAttrs()`, which Vue excludes declared emits from.
- **`vuetifyHeaders` (computed)** – Maps `CoreDataTableHeader<T>[]` to Vuetify's `{ title, key, width, sortable }` shape. `synthetic` columns (no backing field) get `sortable: false`.
- **`customHeaders` (computed)** – Headers for which the view supplied a `header.<key>` slot; used to forward only those header slots.
- **`getValue(item, key)`** – Type-unsafe field reader (`(item as Record<string, unknown>)[key]`), necessary because `T extends object` gives no field access.
- **`rowProps({ item })`** – Returns per-row attributes: a highlight class when selected, `data-test`, `tabindex`, `aria-selected`, and a keydown handler (Enter/Space) for keyboard selection. Non-selectable rows get no focusable/tabindex.
- **`handleRowClick`** – Mouse-click entry point for selection.
- **Template** – Wraps `v-data-table` in a `<div role="region" :aria-label :aria-busy>`. Footer is hidden, `items-per-page="-1"` (server-side pagination). Forwards `header.*` slots only when present; forwards all `item.*` slots with a default of the raw field value or `'-'`.

## Relationships
- **`src/ui/molecules/TableLoadingBar.vue`** – Imported and rendered into the `#loader` slot, replacing Vuetify's default unnamed loading bar.
- **`src/ui/molecules/ListPagination.vue`** – No direct import; they coexist on the same page. `DataTable` hides its own footer and leaves `items-per-page="-1"`, expecting an external pagination control (typically `ListPagination`) to drive the store's `page`/`pageSize`.
- **`docs/reference/src-ui.md`** – References this component in the UI reference.
- **`docs/theory/architecture.md`** – Describes the organism/molecule layering this file belongs to.

## Notes
- **Selection is opt-in and detected via vnode props, not attrs.** `defineModel` declares `update:modelValue` as an emit; Vue removes listeners for declared emits from `$attrs`, so checking `useAttrs()` would always return `false` and no row would ever be selectable. The fix is reading `vnode.props` directly.
- **`caption` is required and semantically important.** It becomes the `aria-label` on the `role="region"` wrapper, which is how screen readers distinguish multiple tables on one page (e.g. the inventory page's stock board vs. movement ledger).
- **`rowTest` exists for pages with two tables.** The default `"list-row"` is what single-table specs expect; the inventory page passes a distinct value so row assertions can target the correct table.
- **Header slots are forwarded conditionally.** Forwarding all `header.*` slots unconditionally would override Vuetify's default header (including the sort icon) on every table in the app.
- **Synthetic columns are non-sortable.** They carry no backing field, so sorting would be a no-op; the sort icon is suppressed to avoid a dead keyboard control.
- **Keyboard selection guards against inner controls.** The keydown handler checks `event.target !== event.currentTarget` and bails, so Enter/Space inside a row's action button or inline input does not select the row.
