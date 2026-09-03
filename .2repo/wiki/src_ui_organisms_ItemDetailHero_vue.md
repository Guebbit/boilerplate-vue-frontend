# src/ui/organisms/ItemDetailHero.vue

## Purpose

Renders the top section of a detail page: a 72 px picture (or a gradient icon tile as fallback) sitting beside the record's eyebrow, title, and description. It exists so every record type shares one consistent hero layout while allowing type-level control over whether an image slot appears at all.

## Key elements

- **`hasImage` prop** — Type-level flag meaning "this *kind* of record has an image field." When absent (defaults to `false`), the icon-tile `<slot name="icon">` is rendered instead of an image. This is intentionally separate from `imageUrl`: an order, which has no image field, should never show a "no picture" stand-in.
- **`imageUrl` / `thumbnailUrl` props** — Unresolved URLs consumed only when `hasImage` is true. Passed straight into `LazyImage`; `thumbnailUrl` may be absent if the image is a remote/default URL or the digest job hasn't finished.
- **`imageAlt` prop** — Accessible label for the picture; falls back to `title` if not supplied.
- **Icon tile (v-else branch)** — A 72 × 72 rounded gradient box (matching the image dimensions exactly) hosting the `icon` slot, marked `aria-hidden`.
- **`CardDetail` wrapper** — Provides the structural card; this component layers a radial-gradient accent glow (driven by `--detail-accent`) on top via scoped CSS.
- **`LazyImage`** — Renders the picture with `:eager="true"` and a 72 × 72 box.

## Relationships

No graph neighbors were reported. The file imports `CardDetail` and `LazyImage` from sibling UI components but no further dependencies are tracked in the dependency graph.

## Notes

- **`hasImage` vs `imageUrl` distinction is deliberate and non-obvious.** A record type that *has* an image field but happens to have an empty value should still show the icon-tile stand-in (the slot). A record type that *lacks* an image field (e.g. an order) must not pass `hasImage` at all, so the slot renders without implying a missing picture. Callers are expected to set `hasImage` based on the type, not on whether the URL is non-empty.
- **No default on `hasImage`.** The prop is optional; Vue coerces its absence to `false`, so no explicit default is needed.
- **72 px is the shared dimension.** Both the `LazyImage` box and the icon tile use `h-18 w-18` / `width=72 height=72` so swapping between them never shifts the text column.
- **`eyebrow` accepts `string | number | null`.** The template guards with `v-if="eyebrow !== undefined && eyebrow !== null"` before rendering, so a numeric eyebrow (e.g. an ID or count) is valid.
