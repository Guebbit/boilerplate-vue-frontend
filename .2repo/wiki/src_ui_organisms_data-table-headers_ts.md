# src/ui/organisms/data-table-headers.ts

## Purpose

Defines the column-header shapes that `DataTable` accepts. It exists as a standalone module (rather than being declared in `<script setup>`) because it must export a `type` union, and `<script setup>` only accepts exported `interface` declarations.

## Key elements

- **`CoreDataTableFieldHeader<T>`** — Interface for a column that reads a property off the row. `key` is typed as `Extract<keyof T, string>`, so a key that doesn't exist on the row is a compile error. Optional `width` overrides the table's auto-sizing.
- **`CoreDataTableSyntheticHeader`** — Interface for a column whose content comes from a named slot (`item.<key>`) rather than a row field (e.g. actions, badges). `key` is a plain `string`, but `synthetic: true` (a literal type) is required, forcing the caller to explicitly acknowledge the key is not a row property.
- **`CoreDataTableHeader<T>`** — Union of the two interfaces above; the single shape `DataTable` consumes for its `headers` prop.

## Notes

- The `synthetic: true` literal is deliberate: without it, a typo in a `key` on a field header would silently satisfy the union (since `string` is assignable to `Extract<keyof T, string>`'s fallback) and render an empty glyph in every row. Requiring the caller to write `synthetic: true` makes "I know this key isn't on the row" an explicit act.
- The file is intentionally a module (top-level exports) rather than `<script setup>` exports because `CoreDataTableHeader<T>` is a `type` alias, which Vue's `<script setup>` cannot re-export.
