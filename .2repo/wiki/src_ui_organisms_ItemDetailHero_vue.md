# src/ui/organisms/ItemDetailHero.vue

## Purpose

Renders the top "hero" strip of a record detail page: a 72 px image (or a gradient icon-tile fallback) laid out beside the record's eyebrow, title, and description. It exists so that detail pages share one visual header regardless of whether the underlying record type has an image field.

## Key elements

- **Props** — `title` (string, required), `description` (string, required), `eyebrow` (string \| number \| null, optional), `hasImage` (boolean, defaults to `false`), `imageUrl` (string \| null, optional), `imageAlt` (string, optional).
- **`hasImage`** — Controls whether a `LazyImage` renders at all. Semantically means "this record *type* has an image field," not "this instance has a non-empty URL." When `false`, the hero shows the icon slot instead.
- **Icon slot** (`name="icon"`) — Rendered inside a fixed `h-18 w-18` (72 px) tile with a gradient background driven by `--detail-accent`. Sized identically to the image so swapping never shifts the text column.
- **`LazyImage`** — Rendered with `:eager="true"`, 72 × 72, `rounded-3xl`, `shadow-lg`.
- **Scoped style `.detail-hero`** — Adds a radial-gradient accent glow in the top-right corner on top of `--v-theme-surface`.

## Relationships

- **`CardDetail.vue`** — Direct wrapper; provides the card chrome and the `detail-hero` class anchor.
- **`LazyImage.vue`** — Used as the image component when `hasImage` is true.

## Notes

- `hasImage` is intentionally separate from `imageUrl`. A record type without an image field (e.g. an Order) omits `hasImage`, so no "missing picture" stand-in is rendered — the icon tile is the *correct* default, not a fallback for an empty URL.
- `eyebrow` accepts `number` as well as `string` to allow numeric values (e.g. a count) without the caller coercing to string.
- `imageAlt` is optional; when omitted the component falls back to `title`. The prop doc notes it is semantically required whenever `hasImage` is true, but this is a convention, not enforced.
- The 72 px (`h-18 w-18`) constraint on both the image and the icon tile is a layout contract — changing one without the other will shift the text column on `sm:` and above.
