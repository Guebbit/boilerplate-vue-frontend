# public/images/guebbit-logo.svg

## Purpose

Black-and-white vector logo for the guebbit brand. Renders a stylized "G" mark used as the primary visual identity on web pages. Contains embedded descriptive metadata for accessibility/SEO context.

## Key elements

- **`<svg id="guebbit-logo">`** — Root element; viewBox `0 0 557.775 548.025`, no explicit fill (defaults to black).
- **`<desc>` with `xmlns:guebbit` namespace** — Carries brand title and keyword text ("web developer, website ecommerce, soluzioni digitali internet") in a non-standard `guebbit:*` element namespace. Not rendered; informational only.
- **First `<path>`** — Main "G" glyph outline (outer shape + inner counter). Coordinates span roughly the full viewBox.
- **Second `<path>`** — A near-duplicate of the first path, offset by approximately 8 units in both X and Y. Likely intended as a subtle drop-shadow or layered echo effect (renders in the same default black, so visually it may overlap or be invisible unless a CSS rule targets it separately).

## Relationships

- **`public/images/guebbit-logo-colored.svg`** — Color variant of the same logo; this file is the monochrome counterpart.
- **`public/favicon/safari-pinned-tab.svg`** — Safari pinned-tab icon derived from the same brand mark; expected to share the "G" shape at a smaller/simplified scale.

## Notes

- No `fill` attribute is set on either path, so both render black. If a colored version is needed, reference `guebbit-logo-colored.svg` instead.
- The two paths are almost identical but **not** the same geometry (coordinates differ by ~8 px). This is not a simple copy; treat them as intentional layers, not a duplicate to remove.
- The `guebbit:` namespace in `<desc>` is non-standard and will be ignored by browsers; it exists only for tooling or manual inspection.
- Generated from Adobe Illustrator 16.0.0 — expect path data to be unoptimized (no simplification or rounding).
