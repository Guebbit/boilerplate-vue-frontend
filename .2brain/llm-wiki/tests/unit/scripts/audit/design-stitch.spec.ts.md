---
source: tests/unit/scripts/audit/design-stitch.spec.ts
sha256: 426717107b7e6d1ddf08456344612f6c910e566525607f476a818f7da022a0fd
signature: ebafb8505d7df26f898adae23e86ec017cf09e022f1acc41bbdce9a60f0deabe
generated_at: 2026-11-10T08:12:33.239807+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/audit/design-stitch.spec.ts

## Purpose

Unit tests for the design-manual audit pipeline's page-capture logic: computing scroll steps, stitching viewport screenshots into a single full-page PNG, slicing that PNG into bounded tiles, and classifying fixed chrome (headers/footers) as bands. The tests use synthetic flat-colour PNGs so expected pixel values can be asserted without external fixtures.

## Key elements

- **`flat(w, h, rgb)`** – helper that builds a solid-colour PNG; used as the base canvas for test images.
- **`shot(scrollY, viewportHeight, bandTop, bandBottom)`** – simulates a browser viewport screenshot: red top band (blue=1), blue bottom band (blue=2), and a content region whose red channel encodes the absolute page row.
- **`redAt` / `blueAt`** – read back a single channel from the first pixel of a given row.
- **`counting(height)`** – builds a PNG whose red channel equals `row % 251`, so tile origins can be verified.
- **`describe('stepsFor')`** – asserts step generation: first step 0, last step at max scroll, step size = viewport minus bands, single step for short pages, `RangeError` when bands fill the viewport, and full row coverage.
- **`describe('stitchSegments')`** – stitches a multi-segment page and verifies canvas height, band placement (top/band once, bottom band once), correct content-row alignment, pass-through for a single segment, and `RangeError` for zero segments.
- **`describe('cutTiles')`** – verifies tile height cap, exact overlap between neighbours, correct offset alignment, last tile reaches page bottom, single tile when page fits, and `RangeError` when overlap ≥ limit.
- **`describe('tileHeightFor')`** – checks the pixel-budget cap (`MAX_TILE_EDGE` = 1560) and per-width budget for tablet/desktop.
- **`describe('classifyFixed')`** – classifies fixed elements as `'band-top'`, `'band-bottom'`, or `'other'` based on edge position, width, and whether they are full-height overlays.
- **`describe('bandsOf')`** – aggregates multiple fixed elements, taking the tallest on each edge, ignoring narrow/non-edge elements.

## Relationships

- **`scripts/audit/design-manual/scripts/bands.ts`** – source of `stepsFor`, `classifyFixed`, and `bandsOf`; this spec is its primary unit-test consumer.
- **`scripts/audit/design-manual/scripts/stitch.ts`** – source of `stitchSegments`, `cutTiles`, `tileHeightFor`, and the `MAX_TILE_EDGE` constant; this spec exercises all four exports.

## Notes

- Tests encode expected pixel values arithmetically (e.g., `row / 4` for content rows, `row % 251` for counting pages) rather than using golden-image snapshots, keeping the suite self-contained.
- `stitchSegments` is tested with a 530 px page in a 200 px viewport (bands 20/10), producing exactly 4 steps; the expected layout is derived entirely from the `shot` helper, not from an external image.
- `MAX_TILE_EDGE` is asserted as the literal `1560` alongside the symbol, pinning the constant's value.
- The `plan-batches.ts`, `a11y-sweep.ts`, and `action-table.ts` files appear in the dependency graph but are **not** imported or exercised by this spec.
