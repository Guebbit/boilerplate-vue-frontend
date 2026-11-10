---
source: src/ui/organisms/DataTable.vue
sha256: c84daed4036847df4e08991a3bda17f9a1c2ec8506791618234cd87463d0a87c
signature: c84daed4036847df4e08991a3bda17f9a1c2ec8506791618234cd87463d0a87c
generated_at: 2026-11-10T06:30:31.035134+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/DataTable.vue

## Purpose

A generic Vue 3 wrapper (`<script setup generic="T extends object">`) over Vuetify's `v-data-table` that adapts the app's `CoreDataTableHeader<T>` shape into Vuetify's header format, conditionally forwards `header.*`/`item.*` slots, and layers two opt-in behaviours—single-row selection and sorting—on top, each activated only when the parent actually binds the corresponding `v-model`.

## Key elements

- **`defineProps`** — Accepts `headers`, `items`, `caption`, `itemValue`, `loading`, `loadingText`, `noDataText`, `rowTest`, and `serverSortKeys`. Pagination is always server-side (`items-per-page="-1"`, footer hidden).
- **`modelValue` / `sortBy`** (`defineModel`) — Bound row ID and Vuetify sort state, respectively. Neither is "active" unless the parent attaches a listener.
- **`isSelectable` / `isSortable`** (computed) — Detect whether the parent bound `onUpdate:modelValue` / `onUpdate:sortBy` by inspecting the vnode's props directly (bypassing `$attrs`, where declared-emit listeners are stripped).
- **`vuetifyHeaders`** (computed) — Maps `CoreDataTableHeader[]` to Vuetify's column defs; forces `sortable: false` on `synthetic` columns; injects `sort: () => 0` comparator when `serverSortKeys` is set so Vuetify reports the click without reordering the local page.
- **`customHeaders`** (computed) — Subset of headers for which the caller provided a `header.{key}` slot; only those get forwarded, so Vuetify's default header (with sort icon) is preserved elsewhere.
- **`rowProps`** — Per-row attributes: `bg-surface-variant` highlight, `data-test`, `tabindex="0"`, `aria-selected`, and an `onKeydown` handler (Enter/Space) for keyboard selection.
- **`handleRowClick`** / **`select`** — Click and keyboard entry points that write the row's `itemValue` into `modelValue`.
- **Template** — Wraps the table in a `role="region"` div carrying `aria-label` (caption) and `aria-busy`; swaps Vuetify's loader slot for `TableLoadingBar`; sets `mobile-breakpoint="sm"` and `fixed-header` (prevents header dimming during load, WCAG 1.4.3).

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Bound-model detection:** `defineModel` cannot distinguish a parent-bound ref from an unbound local one. The component reads `getCurrentInstance()?.vnode.props` for the `onUpdate:*` key instead. Checking `$attrs` would always fail because Vue removes listeners for declared emits from attrs.
- **Server sort semantics:** When `serverSortKeys` is present, only those columns render a sort affordance, and Vuetify's local row reorder is neutralised (`sort: () => 0`). The caller is expected to re-fetch with the new `sort-by` value.
- **`caption` is not cosmetic:** it becomes the `aria-label` on the surrounding `role="region"` div, which is how a screen reader distinguishes two tables on the same page (e.g., the inventory board vs. the movement ledger).
- **`rowTest`** defaults to `'list-row'` for single-table pages; multi-table pages override it so specs can target rows in a specific table.
- **`loadingText` / `noDataText`** are optional overrides for Vuetify's i18n defaults; leaving them unset lets the app's locale file take precedence rather than a hardcoded English string.
