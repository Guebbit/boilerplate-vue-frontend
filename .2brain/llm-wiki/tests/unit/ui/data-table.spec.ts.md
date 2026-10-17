---
source: tests/unit/ui/data-table.spec.ts
sha256: b5a9c46c5cef16a311ba5d1a7ed5a7c0b3a33c7be7376691d254224086235887
generated_at: 2026-10-17T02:45:36.777745+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/data-table.spec.ts

## Purpose

Unit tests for `DataTable.vue` that verify the accessibility and behavioral contract every list page relies on without restating it: region naming via `aria-label`, the busy flag, header sortability being inert unless the caller actually bound a sort model, server-side vs. client-side sort semantics, and keyboard-selectable rows.

## Key elements

- **`mountTable`** – Helper that mounts `DataTable` with Vuetify + i18n plugins, a fixed `headers`/`items` pair, and optional prop/attr overrides. Casts headers to `CoreDataTableHeader<object>[]` because the generic mount signature loses the row type.
- **`Row` interface, `headers`, `items`** – Minimal test data (two rows, two columns, one synthetic "Actions" column) shared across most tests.
- **`selectable` / `sortBound`** – Simulated `v-model` listener objects (`onUpdate:modelValue`, `onUpdate:sortBy`) that make the component believe a caller bound a model, unlocking selectability and sortability respectively.
- **`describe` blocks** – Four groups: *name and busy flag*, *headers* (sortability, synthetic-column exclusion, localized text fallback), *server sort* (column restriction, non-reordering, client-side fallback), *keyboard selection* (tab order, Enter/Space emission, inner-control suppression, `aria-selected` marking).

## Relationships

- **`tests/support/unit/mounted-vm.ts`** – Provides `nextRenderTick`, imported and used in the "marks the selected row" test to flush Vue reactivity before asserting `aria-selected`.

## Notes

- Tests assert *structural accessibility* (roles, ARIA attributes, `tabindex`, classes) rather than pixel layout or exact text, deliberately avoiding coupling to Vuetify's internal strings.
- The "server sort" group confirms the component does **not** reorder its `items` array when `serverSortKeys` is set—the server is expected to have already ordered them.
- The inner-control keyboard test mounts a second, hand-built `mount` call (not via `mountTable`) to supply an `item.actions` slot containing a button, verifying that `keydown` on a nested control does not leak a selection event.
- `selectable` and `sortBound` carry `eslint-disable` comments because their property names (`onUpdate:modelValue`) violate the project's naming-convention rule but are required by Vue's `v-model` attr protocol.
