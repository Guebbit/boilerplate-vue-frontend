# src/ui/molecules/ItemDetailField.vue

## Purpose

Atomic, read-only field for detail pages that renders a single label/value pair alongside an icon tile. It standardizes how individual data points are displayed so parent detail views can compose many of these in a grid without repeating layout logic.

## Key elements

- **`props`** — `label` (string), `value` (string \| number \| null, optional), `icon` (string, optional), `fullWidth` (boolean, optional).
- **`displayValue`** (computed) — Returns `String(props.value)`, or `EMPTY_VALUE` when the value is `undefined`, `null`, or `''`. Used as the fallback for the default slot.
- **Template** — A `<article>` laid out as a two-column CSS grid (3rem icon tile + flexible text). The default slot renders `displayValue`; callers can slot in richer content to override it.
- **`.detail-field-icon`** (scoped style) — Applies a gradient background and text color derived from the `--detail-accent` CSS custom property.

## Relationships

- Imports `EMPTY_VALUE` from `@/infrastructure/utils/formatters.ts` as the placeholder shown for absent values.
- Consumes the `--detail-accent` CSS custom property, which is expected to be set on an ancestor element by the parent detail view.

## Notes

- `--detail-accent` is **not** defined here; the hosting page/view must set it (as an RGB triplet) or the icon tile will render with an invalid color.
- The `icon` prop is rendered as raw text (`{{ props.icon }}`), so it is intended for emoji or Unicode glyphs, not SVG components.
- Passing `fullWidth` adds `col-span-full`, which is only meaningful when the parent grid has more than one column.
- The default slot fallback means callers can pass arbitrary Vue templates (e.g., links, badges) in place of the plain `displayValue` string.
