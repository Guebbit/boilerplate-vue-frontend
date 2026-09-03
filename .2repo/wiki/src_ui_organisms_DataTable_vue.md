# src/ui/organisms/DataTable.vue

## Purpose

A generic (`T extends object`) Vue SFC that wraps Vuetify's `v-data-table` to provide a consistent, accessible table for the app. It translates the app's `CoreDataTableHeader<T>` shape into Vuetify column definitions, forwards caller-provided `header.*`/`item.*` slots, replaces the default loader with `TableLoadingBar`, and adds optional single-row selection via `v-model`. Pagination is server-side: the footer is hidden and `items-per-page` is set to `-1`.

## Key elements

- **`defineProps`** — accepts `headers`, `items`, `caption`, `itemValue`, `loading`, `loadingText`, `noDataText`, `rowTest`. `caption` drives the `aria-label`; `rowTest` (default `"list-row"`) is the `data-test` on every `<tr>` and lets a page with two tables disambiguate rows in specs.
- **`modelValue` (`defineModel`)** — holds the selected row's `itemValue`; `undefined` when nothing is selected.
- **`isSelectable` (computed)** — reads `onUpdate:modelValue` from the component's vnode props to detect whether a `v-model` listener is bound. Used instead of `$attrs` because Vue excludes listeners for declared emits from attrs, so an attrs-based check would always be `false`.
- **`customHeaders` (computed)** — the subset of `headers` whose `header.<key>` slot the caller actually provides; only those are forwarded, preserving Vuetify's default (sortable) header for the rest.
- **`vuetifyHeaders` (computed)** — maps `CoreDataTableHeader` entries to Vuetify's `{ title, key, width, sortable }` shape. Headers marked `synthetic` get `sortable: false`.
- **`getValue(item, key)`** — type-erased property read: `(item as Record<string, unknown>)[key]`.
- **`select(item)`** — sets `modelValue` to the row's `itemValue`; no-op when `isSelectable` is false.
- **`rowProps({ item })`** — returns per-row attributes: `bg-surface-variant` class + `aria-selected` when selected, `tabindex="0"`, a `keydown` handler for Enter/Space (guarded so keys inside row controls don't trigger selection), and the `data-test` hook.
- **`handleRowClick`** — `@click:row` handler that calls `select`.
- **Template** — wraps `v-data-table` in a `<div role="region">` carrying `aria-label` (from `caption`) and `aria-busy`. Sets `mobile-breakpoint="sm"` so Vuetify's built-in stacked-card layout kicks in below 600 px. The `#loader` slot is replaced with `<TableLoadingBar />`.

## Relationships

- **`@/ui/molecules/TableLoadingBar.vue`** — imported and rendered in the `#loader` slot, replacing Vuetify's default loading bar.
- **`@/ui/organisms/data-table-headers.ts`** — provides the `CoreDataTableHeader<T>` type that defines the app's header shape (including the optional `synthetic` flag).

## Notes

- **`isSelectable` must read the vnode, not `$attrs`.** `defineModel` declares the `update:modelValue` emit; Vue keeps a listener for a declared emit *out* of `$attrs`. Checking `$attrs` would always yield `false` and no row would ever be selectable.
- **`synthetic` headers are unsortable.** A column that reads no field would otherwise render a focusable sort icon in Vuetify's `<th>` that does nothing; `sortable: false` suppresses that control.
- **Server-side pagination contract.** The component never paginates; the caller's store owns `pageSize`/`pageCurrent` and passes the already-paged `items` array. `items-per-page="-1"` and `hide-default-footer` enforce this.
- **Slot forwarding is selective for `header.*` but blanket for `item.*`.** Header slots are forwarded only when the caller provides them (to avoid clobbering Vuetify's sort UI on every table). Item slots are always forwarded for every header to preserve the existing view API; the fallback slot renders `getValue(...) ?? '-'`.
- **Keyboard selection guard.** The row `keydown` handler checks `event.target !== event.currentTarget` and bails, so Enter/Space inside an inline form control or action button within a row does not select the row.
