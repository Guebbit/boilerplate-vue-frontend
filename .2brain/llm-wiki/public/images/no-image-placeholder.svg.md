---
source: public/images/no-image-placeholder.svg
sha256: f3005ea4f03bec797d8f5445593520728316208600636875253da933acba27cb
generated_at: 2026-10-02T11:27:01.685277+00:00
model: ollama:qwen3.8:27b
---

# public/images/no-image-placeholder.svg

## Purpose

Static SVG fallback icon shown when a valid image cannot be displayed. It renders the standard "broken picture" glyph (frame + sun + mountains) in a neutral gray so the UI has a recognizable placeholder instead of a blank or broken-image icon.

## Key elements

- **`<rect>`** – 46×38 rounded rectangle (the picture frame), stroked in `#9e9e9e`.
- **`<circle>`** – Small filled circle at top-left of the frame (the "sun").
- **`<path>`** – Zig-zag polyline forming two peaks (the "mountains"), rounded caps/joins.
- **`viewBox="0 0 64 64"`** – Fixed square coordinate space; scales with whatever container sizes it.

## Relationships

- **`tests/e2e/fixtures/not-an-image.txt`** – End-to-end tests use this non-image file as an intentionally invalid image source. The test asserts that this placeholder SVG is rendered in its place, confirming the fallback path works.

## Notes

- Purely static markup: no scripts, no external references, no `id` attributes. Safe to inline or load via `<img>` / `background-image`.
- Color is hardcoded to `#9e9e9e`; it will not adapt to dark mode unless the consuming component overrides it (e.g., CSS `filter` or a CSS custom property swap).
- Because the file has an `.svg` extension it is served with a `+image/svg+xml` content type. Do **not** rename it to a non-image extension—e2e tests depend on the fallback being triggered by the *source* being non-image, not by the placeholder's own extension.
