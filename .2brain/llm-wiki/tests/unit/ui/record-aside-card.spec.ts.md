---
source: tests/unit/ui/record-aside-card.spec.ts
sha256: 3cad4cc1f033bcc5d3773477c9b304e1269c5f7610885c4807bfd7df95d65dff
signature: 2560b31e1eb7538a4f343759cc474b4fd404129af0495d51d734657c9a600101
generated_at: 2026-11-10T08:28:16.421155+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/record-aside-card.spec.ts

## Purpose

Structural spec for `RecordAsideCard.vue`. Because the component holds no record logic (it is a presentational card beside detail/edit pages), the tests assert only markup shape: root element, title/description rendering, field-row ordering, test hooks, slot behavior, and the empty state.

## Key elements

- **`ROWS`** — Fixture array of three `DetailFieldRow` objects; the middle row carries a `test` hook (`row-id`) and an `icon` (lucide `Hash`), the last has a `null` value.
- **`mountCard(fields?, slots?)`** — Helper that mounts `RecordAsideCard` with fixed props (`title: 'Ada'`, `description: 'Admin'`, `accent: 'secondary'`), the given rows, optional slot template strings, and the project's Vuetify plugin.
- **`describe('RecordAsideCard')`** — Six `it` blocks covering:
  - Root is `<aside>` and contains title + description text.
  - One `<article>` per row, rendered in array order with the correct label.
  - A row-level `data-test` hook appears on its field's element.
  - The `icon` slot replaces the default tile icon.
  - The default slot renders *after* the rows (checked via index comparison in the HTML string).
  - Zero `<article>` elements when `fields` is an empty array.

## Relationships

No graph neighbors are tracked for this file.

## Notes

- Slot templates are passed as raw HTML strings (e.g. `'<i data-test="custom-icon" />'`); this works with `@vue/test-utils` but means you cannot use Vue expressions or bindings in slot content here.
- The "after the rows" assertion relies on `indexOf` over the full rendered HTML string — it is order-sensitive but not scoped; if the component structure changes significantly the comparison could give false positives.
- `null` value in the `ROWS` fixture is intentional: it exercises the card's handling of a missing value without asserting specific rendering of that state.
