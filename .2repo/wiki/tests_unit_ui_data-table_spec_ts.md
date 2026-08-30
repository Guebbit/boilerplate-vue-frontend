# tests/unit/ui/data-table.spec.ts

## Purpose

Unit tests for the `DataTable.vue` component's accessibility contract: ARIA region naming, loading indicator, sortable vs. synthetic header behavior, and keyboard-driven row selection. Exists so that every list page can rely on these guarantees without re-testing them locally.

## Key elements

- **`mountTable`** — Helper that mounts `DataTable` with fixed headers/items/caption, the vuetify + i18n plugins, and spreadable `props`/`attributes` overrides. Centralises the cast to `CoreDataTableHeader<object>[]`.
- **`selectable`** — A minimal `{ 'onUpdate:modelValue': () => {} }` attrs object simulating a `v-model` binding; passed as `attrs` rather than `props` to avoid triggering the prop-type path.
- **`Row` / `headers` / `items`** — Minimal fixture data (two rows, two columns) where the second header is marked `synthetic: true` to exercise the "actions column" path.
- **Three `describe` blocks:**
  - *name and busy flag* — asserts `role=region` carries `aria-label` from `caption` and toggles `aria-busy` with `loading`.
  - *headers* — asserts field columns are `v-data-table__th--sortable` + `tabindex="0"`, while synthetic columns are neither.
  - *keyboard selection* — covers: no-selectable table keeps rows out of tab order; Enter/Space on a focused row emits `update:modelValue`; keydown on a nested control (actions slot button) is ignored; pre-selected row carries `aria-selected="true"`.

## Relationships

No graph neighbours are recorded for this file. It imports `DataTable.vue`, `data-table-headers.ts` (type only), the vuetify plugin, and the i18n instance, but no other test or source file is linked in the dependency graph.

## Notes

- The `headers as CoreDataTableHeader<object>[]` cast is intentional: the component's generic mount signature widens to `object`, so the annotation documents intent rather than adding type safety.
- `selectable` carries an `eslint-disable` for the `@typescript-eslint/naming-convention` rule because `onUpdate:modelValue` is Vue's reserved listener name, not a project convention violation.
- The "ignores a key pressed inside a control" test mounts `DataTable` directly (not via `mountTable`) in order to supply an `item.actions` slot with a real `<button>`; `mountTable` has no slot parameter.
- Row identity in selection assertions is the `id` field (`'a'`, `'b'`), not the index — the component emits the model value derived from the row's identity, so tests assert `[['a'], ['b']]` rather than indices.
