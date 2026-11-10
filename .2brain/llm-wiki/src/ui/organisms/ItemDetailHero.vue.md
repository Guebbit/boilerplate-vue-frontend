---
source: src/ui/organisms/ItemDetailHero.vue
sha256: 5208c9350c8db01cd40a626348bdad2b70cfc944db8b79fe966c6fe319af3633
signature: a972ba07ec198e781f88d4d8be6d4f16fcaa67f1b53e74f5304b2f06f8e2dae8
generated_at: 2026-11-10T06:32:07.707254+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/ItemDetailHero.vue

## Purpose

Renders the top section of a record detail page: a 72 px image (or an icon-tile placeholder) alongside the record's eyebrow, title, and description. It exists so that different record types (products, users, orders, …) can share one hero layout while controlling whether a picture is shown at the **type** level rather than per-instance.

## Key elements

- **`hasImage` (prop, optional boolean)** — Gates whether the hero renders a `LazyImage` or falls back to the icon slot. Represents whether the *record type* has an image field, not whether this particular record populated one. Absent = `false` (Vue default), so orders, which have no image field, simply omit it.
- **`imageUrl` / `thumbnailUrl` (props, optional string|null)** — Unresolved URLs passed through to `LazyImage`. Only meaningful when `hasImage` is true. `thumbnailUrl` may be absent for remote/default images or before a digest job completes.
- **`imageAlt` (prop, optional string)** — Accessible label for the image; falls back to `title` in the template.
- **`eyebrow` (prop, optional string|number|null)** — Small uppercase line above the title (e.g. category, status). Hidden when `undefined` or `null`.
- **`icon` slot (named)** — Content placed inside the 72 × 72 px placeholder tile when no image is shown. Marked `aria-hidden`.
- **`LazyImage` usage** — Rendered with `:eager="true"`, 72 × 72 px, `rounded-xl`, `elevation-4`.
- **`.detail-hero` scoped style** — Sets `--glow-color: var(--detail-accent)` so the shared `.surface-glow` utility (defined in `main.css`) picks up the page's accent colour.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The icon tile uses `h-18 w-18` (72 px) specifically to match the image dimensions, so swapping between image and icon never shifts the text column.
- `hasImage` is deliberately **not** inferred from `imageUrl` being truthy. A product with an empty `imageUrl` still renders the "no picture" stand-in (because the type *has* an image); an order with no image field must not show a stand-in (because the type *lacks* one). Callers control this by simply omitting the prop.
- The component has no local state, no emits, and no lifecycle hooks — it is purely presentational.
