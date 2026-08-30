# public/images/guebbit-logo-colored.svg

## Purpose

The primary colored brand logo for guebbit, rendered as a two-layer vector "G" mark. It exists as the canonical scalable source for the brand's color identity, referenced wherever a crisp, resolution-independent logo is needed (banners, favicons, print exports).

## Key elements

- **`<desc>` metadata block** — Custom `xmlns:guebbit` namespace carries `<guebbit:title>` ("guebbit") and `<guebbit:descr>` with SEO/keyword text ("web developer, website ecommerce, soluzioni digitali internet"). Non-standard; only meaningful if a consumer reads it.
- **Shadow `<path>`** (`fill:#008697`) — The darker, slightly offset outline of the "G" shape. Sits behind the body layer to produce a flat drop-shadow effect. Comment notes the original palette color was `#11838E`.
- **Body `<path>`** (`fill:#36B9CF`) — The main "G" glyph in the brand's primary cyan. Overlaps the shadow path, shifted up-left by roughly 8 units to reveal the shadow on the right/bottom edges.
- **`viewBox="0 0 557.775 548.025"`** — Slightly wider than tall; the logo is not square.

## Relationships

- **`public/images/guebbit-logo-colored.png`** — Raster export of this same logo. Use the PNG when a vector renderer is unavailable (e.g., `<img>` in legacy email, certain CMS themes); use this SVG for everything else.
- **`public/images/guebbit-logo.svg`** — Monochrome/single-color variant of the same "G" mark, intended for contexts where the full palette is undesirable (dark mode, watermarks, single-color print).

## Notes

- The `<desc>` block uses a non-standard `guebbit` XML namespace and nested `<guebbit:*>` elements inside a standard SVG `<desc>`. Most SVG renderers will ignore it; treat it as embedded metadata, not a functional dependency.
- Two path layers are **not** semantically grouped (no `<g>` wrapper); they rely on document order (shadow first, body second) for correct paint order. Reordering or extracting one path breaks the shadow effect.
- The file was exported from Adobe Illustrator 16.0 (2011-era). Paths are absolute-coord `M`/`C` commands; no symbols, defs, or gradients are used.
- Because the shadow is a separate opaque path (not a `filter` or `stroke`), it does **not** scale as a true shadow — resizing the SVG scales both layers identically, preserving the flat offset look.
