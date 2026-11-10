---
source: src/ui/organisms/data-table-headers.ts
sha256: 1ab77534a2596bfac7641ce7b5d81e5e1b2d20497dbf30b2b1b6b6a72d9a4441
signature: 5ea10a5c0b028ae914d234bb08acbdf0cede651087fa82c565cf32be42cd842d
generated_at: 2026-11-10T06:33:04.899430+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/data-table-headers.ts

## Purpose

Defines the column-header type contract for the `DataTable` organism. It splits a column into two explicit shapes—field-reading vs. synthetic—so the type system catches a column key that names a property the row type doesn't have. Lived in its own module because Vue's `<script setup>` can export an `interface` but not a `type` alias.

## Key elements

- **`CoreDataTableFieldHeader<T>`** (interface, not exported) — A column whose `key` is constrained to `Extract<keyof T, string>`. Optional layout props: `width`, `minWidth`, `maxWidth` (each `string | number`), and `fixed?: 'start'` to pin the column to the scroll container's leading edge.
- **`CoreDataTableSyntheticHeader`** (interface, not exported) — A column that does **not** read from the row. `key` is a free `string`; `synthetic: true` (literal) is required, acting as an intentional opt-in so a typo in a field column can't accidentally satisfy this shape. Shares the same optional layout props.
- **`CoreDataTableHeader<T>`** (exported `type`) — The union of the two interfaces above. This is the only public export of the module.

## Relationships

No graph neighbors. The file has no imports and is a pure type-definition module; consumers import `CoreDataTableHeader` wherever a column array is declared.

## Notes

- The module docblock states the reason for separation: `<script setup>` accepts an exported `interface` but **not** an exported `type`. The two `interface`s live here so the union can be expressed as a `type` and still be consumable.
- `synthetic: true` is a deliberate literal-type discriminator. It is not a runtime flag; its only job is to make "this column intentionally has no row field" explicit at compile time.
- `fixed` is currently only `'start'`; there is no `'end'` variant.
- The docblock on `CoreDataTableFieldHeader` references a past production incident: a `key: 'total'` shipped against an `Order` row type that has `totalItems`/`totalQuantity`/`totalPrice` but no `total`, rendering an empty glyph in every row. The `keyof T` constraint is the guard against that class of bug.
