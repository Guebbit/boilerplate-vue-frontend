---
source: tests/unit/ui/data-table.spec.ts
sha256: 6d14664da343d9b7b2fd88bcb92eb4b2f591e7fefb68c97479bb9c794cfb3d2c
signature: 60d6c3deb0f5bc2cb4f5381eef05af6b7c03b55c13effc416c3262070ca13f42
generated_at: 2026-11-10T08:24:23.289915+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/data-table.spec.ts

## Purpose

Unit tests for the `DataTable.vue` organism, verifying the accessibility and interaction guarantees that consuming list pages (products, orders, users) rely on without asserting them themselves: region naming, conditional sortability, keyboard-reachable row selection, server-vs-client sort semantics, and loading-state visuals.

## Key elements

- **`mountTable`** – Shared factory that mounts `DataTable` with a default set of `headers`, `items`, and `caption`, plus a Vuetify + i18n plugin pair. Accepts extra `props` and `attrs` for per-test overrides.
- **`selectable` / `sortBound`** – Stub listener objects (`onUpdate:modelValue`, `onUpdate:sortBy`) that simulate a parent binding a `v-model`, letting tests assert the table's opt-in behavior without a real parent.
- **`describe('DataTable — the name and the busy flag')`** – Asserts the `role="region"` wrapper carries `aria-label` from `caption` and `aria-busy="true"` when `loading` is set.
- **`describe('DataTable — the headers')`** – Verifies headers stay inert (no sortable class, no `tabindex`) unless a sort model is bound; synthetic headers remain inert even when sort is bound; Vuetify's own localized loading text renders rather than a hard-coded default.
- **`describe('DataTable — server sort')`** – Confirms only columns listed in `serverSortKeys` become sortable; server-sorted rows are rendered in the order the API supplied (no client re-sort); without `serverSortKeys` the component sorts locally.
- **`describe('DataTable — keyboard selection')`** – Rows are outside tab order without a `v-model`; with one, Enter/Space trigger `update:modelValue`; keys pressed inside row-embedded controls (e.g. an actions button) do not bubble to selection; selected rows carry `aria-selected="true"`.
- **`describe('DataTable — header options and loading')`** – Checks `fixed: 'start'` applies Vuetify's fixed-column class to both `th` and `td`; the `v-table--fixed-header` class is present while loading.

## Relationships

- **`tests/support/unit/mounted-vm.ts`** – Provides `nextRenderTick`, used in the "marks the selected row" test to flush a Vue re-render before asserting `aria-selected`.

## Notes

- The file intentionally does **not** assert exact English loading text; it only checks that *something* renders, so the test stays locale-agnostic and doesn't restate Vuetify's copy.
- `selectable` and `sortBound` carry `eslint-disable` comments because their key names (`onUpdate:modelValue`) are Vue's own convention and can't follow the project's naming rule.
- The `headers` array is cast to `CoreDataTableHeader<object>[]` at the `mountTable` boundary because the component's generic mount signature widens to `object`; the template itself enforces the row type.
- The server-sort "does not reorder" test pre-seeds rows in the *server's* order (Beta before Alpha) so a failing client-side sort would be caught by the assertion.
