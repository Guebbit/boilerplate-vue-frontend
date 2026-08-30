# src/ui/organisms/data-table-headers.ts

## Purpose

Defines the column-header type shapes that `DataTable` accepts. It lives in its own module (rather than a component's `<script setup>`) because the two header forms are combined into a union **type**, and Vue's `<script setup>` can export an `interface` but not a `type` alias.

## Key elements

- **`CoreDataTableFieldHeader<T>`** (interface) — a column that reads a property off the row. `key` is constrained to `Extract<keyof T, string>`, so a typo'd field name is a compile error. Optional `width` overrides the table's auto-width.
- **`CoreDataTableSyntheticHeader`** (interface) — a column whose content does **not** come from a row field (actions, computed badges, etc.). `key` is a plain `string`; the required `synthetic: true` literal is the only way to select this variant of the union, making accidental misuse impossible.
- **`CoreDataTableHeader<T>`** (type alias) — the discriminated-union of the two interfaces above. This is what callers pass as the `headers` prop.

## Relationships

No recorded graph neighbors; this module is a leaf type-definition file consumed directly by the `DataTable` component.

## Notes

- The `synthetic: true` literal acts as a type-level discriminator. You cannot construct a `CoreDataTableSyntheticHeader` without it, and a `CoreDataTableFieldHeader` can never satisfy it — the union is fully disjoint at the type level.
- A prior bug shipped a `key: 'total'` on an `Order` row that only has `totalItems`, `totalQuantity`, `totalPrice`. The empty-glyph (em-dash) output was recorded as a visual baseline before the fix, so the regression suite now expects correct field names. The `Extract<keyof T, string>` constraint is the guard that should have caught it at compile time.
- When adding a new column type, remember the `<script setup>` export limitation: keep union types in a dedicated module like this one.
