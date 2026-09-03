# src/ui/molecules/ItemDetailField.vue

## Purpose

Atomic, read-only presentational field for detail pages. Renders a single label/value pair with a decorative icon tile. Designed to be dropped into a CSS-grid layout where the parent controls the accent color.

## Key elements

- **`props`** — `label` (string), `value` (string | number | null | undefined), `icon` (optional glyph string), `fullWidth` (boolean; toggles `col-span-full`).
- **`displayValue`** (computed) — Normalises `value` to a string; returns `EMPTY_VALUE` when the value is `undefined`, `null`, or `''`.
- **Template** — An `<article>` with a two-column grid (icon tile + text block). The value area exposes a **default slot**; if the caller provides slot content it replaces `displayValue` entirely.
- **Scoped style** — `.detail-field-icon` applies a gradient background and text colour derived from the `--detail-accent` CSS custom property.

## Relationships

- Imports `EMPTY_VALUE` from `@/infrastructure/utils/formatters.ts`.
- Expects the parent page/view to set the `--detail-accent` CSS variable on an ancestor element.
- No other graph neighbours.

## Notes

- The icon element is `aria-hidden="true"` — it is purely decorative and must not carry semantic meaning.
- `fullWidth` is a Tailwind class toggle (`col-span-full`), so the component is intended to live inside a CSS grid container; outside a grid it has no effect.
- The default slot can render arbitrary content (e.g., a link, a badge) in place of the plain stringified value.
- Long values are handled with `[overflow-wrap:anywhere]` rather than a custom scrollbar or truncation.
