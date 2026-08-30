# public/images/no-image-placeholder.svg

## Purpose

A static SVG icon used as a fallback/placeholder when no actual image is available. It renders a simple landscape glyph (rounded frame, sun, mountain ridge) in a neutral gray so the UI still shows a recognizable "image" shape instead of a blank space or broken-link icon.

## Key elements

- **`<rect>`** — 46×38 rounded rectangle (`rx="4"`) forming the picture frame; stroked in `#9e9e9e`, 3 px wide.
- **`<circle>`** — Small filled circle (r = 4) representing the "sun" inside the frame.
- **`<path>`** — Polyline (four connected segments) depicting a mountain silhouette; round line caps/joins, 3 px stroke, same gray.
- All shapes share the single color `#9e9e9e`, so the icon is inherently monochrome and adapts to light or dark backgrounds without extra CSS.

## Relationships

- **`tests/e2e/fixtures/sample-image.png`** — E2E test fixtures supply real image data; this SVG is what the UI renders when such an image is absent or fails to load, so tests can assert the placeholder appears in place of the fixture.

## Notes

- The SVG has no `<text>`, no `id`, and no external references — it is fully self-contained and safe to inline.
- Because the stroke/fill color is hardcoded to `#9e9e9e`, the icon will not automatically follow CSS `currentColor` or theme tokens. If theming is needed, the color must be overridden externally (e.g., via `filter` or a `<style>` block).
- The `viewBox` is 64×64; the icon scales losslessly to any display size.
