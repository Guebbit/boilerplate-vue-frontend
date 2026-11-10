---
source: scripts/audit/design-manual/scripts/stitch.ts
sha256: b9857349b9a0ca428cc034e2870cfe79d1bc88c455a65100feca846a6fadbaef
signature: 59fedae27c091305d55529f90612cd11c0d7e4ba67929a77151705a20ad6d8ac
generated_at: 2026-11-10T02:23:36.830025+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/design-manual/scripts/stitch.ts

## Purpose

Pure image-geometry helpers for the design-capture pipeline: it stitches a sequence of viewport PNGs (shot at known scroll positions) into one tall canvas, then slices that canvas into model-sized tiles. It contains no Cypress, browser, or disk I/O — the calling Node tasks supply PNG buffers and receive PNG buffers back.

## Key elements

- **`MAX_TILE_EDGE`** (1560 px) and **`MAX_TILE_PIXELS`** (1 150 000) — hard caps on tile size so every Anthropic vision model reads the tile at full resolution without downscaling.
- **`TILE_OVERLAP`** (40 px) — default shared rows between adjacent tiles so elements straddling a cut remain whole in at least one tile.
- **`Segment`** — one viewport shot: a `PNG` plus the browser-reported `scrollY`.
- **`StitchInput`** — `{ segments, bandTop, bandBottom, pageHeight }`; the fixed-chrome band sizes are trimmed from all but the first (top) / last (bottom) segment.
- **`Tile`** — a slice `{ png, offsetY }` where `offsetY` is the row on the stitched page where the slice begins.
- **`tileHeightFor(width)`** — returns the maximum tile height for a given width, the minimum of the edge cap and the pixel cap divided by width.
- **`stitchSegments(input: StitchInput): PNG`** — lays segments onto a single `pageHeight`-tall canvas at their real scroll offsets, trimming the repeated app-bar / footer bands.
- **`cutTiles(page, maxHeight, overlap?)`** — iterates a stitched page top-to-bottom, emitting overlapping tiles no taller than `maxHeight`. Throws `RangeError` if `maxHeight <= overlap`.
- **`copyRows`** (private) — wraps `PNG.bitblt` to copy a row range between two images, clamping to canvas bounds.

## Relationships

- **`scripts/audit/design-manual/scripts/capture-task.ts`** — the Cypress Node-task layer that drives the browser, collects `Segment[]` buffers, and calls `stitchSegments` → `cutTiles` with the results. `stitch.ts` is the pure half; `capture-task.ts` is the I/O half.
- **`tests/unit/scripts/audit/design-stitch.spec.ts`** — unit tests exercising `tileHeightFor`, `stitchSegments`, and `cutTiles` with synthetic PNG buffers.

## Notes

- The tile-size caps were validated against Anthropic's vision docs on 2026-10-18; changing them requires re-checking the current model limits (models before Opus 4.7 downscale past 1568 px, newer models past 2576 px).
- `scrollY` on a `Segment` is the value the browser *actually* reported (it clamps at page bounds), not the value requested — `stitchSegments` trusts this value for placement.
- `PNG.bitblt` is the only pixel-copy primitive used; its argument order is `(src, dst, srcX, srcY, width, height, deltaX, deltaY)` — easy to transpose by mistake.
- `cutTiles` uses a `for (;;)` loop with an early `return`; the final tile is always exactly `page.height - offsetY` rows tall (possibly shorter than `maxHeight`).
