---
source: scripts/audit/design-manual/scripts/bands.ts
sha256: c3b83cedfe7547a4ed1dd39d1dc9a58e0f3fbfedce9ca5657174624a0a51d3dc
signature: b5a855805b94fe0e4341b96211473bb8f974efa70620672d2cb6028925adca81
generated_at: 2026-11-10T02:20:03.089596+00:00
model: ollama:qwen3.8:27b
---

# scripts/audit/design-manual/scripts/bands.ts

## Purpose

Pure arithmetic shared between the browser-side capture (`design-capture.ts`) and the Node-side stitcher (`stitch.ts`), which cannot both load the same bundle because `stitch.ts` depends on `pngjs`. This module holds the scroll-offset calculation and fixed-element band classification so both halves agree on the numbers without pulling in an image library, a DOM, or a disk.

## Key elements

- **`stepsFor(pageHeight, viewportHeight, bandTop, bandBottom): number[]`** — Returns the list of scroll offsets needed to screenshot a full page. Each step advances by `viewportHeight − bandTop − bandBottom`; the final offset is clamped to `pageHeight − viewportHeight` (guaranteeing an overlap with the previous shot). Throws `RangeError` if the bands leave zero room to advance.
- **`FixedBox`** *(interface)* — A browser-measured box of a `position: fixed` element: `selector`, `top`, `height`, `width` (all relative to the viewport).
- **`FixedClass`** *(type)* — Union `'band-top' | 'band-bottom' | 'other'` describing how the stitcher should treat the element.
- **`classifyFixed(box, viewport): FixedClass`** — Decides whether a fixed element is a top band, a bottom band, or `other`. Criteria: at least half the viewport wide **and** touching exactly one edge. An element touching both edges (e.g. a full-height overlay) is always `other`.
- **`bandsOf(boxes, viewport): { bandTop, bandBottom }`** — Scans all fixed elements and returns the tallest top band and tallest bottom band, so a single cut covers every band.

## Relationships

- **`tests/support/e2e/design-capture.ts`** — The browser-side caller. It measures fixed elements into `FixedBox` values, feeds them through `classifyFixed`/`bandsOf` to get the band heights, then passes those numbers into `stepsFor` to obtain the scroll offsets for its screenshots.
- **`tests/unit/scripts/audit/design-stitch.spec.ts`** — Exercises the stitcher that consumes the same band arithmetic (the `bandTop`/`bandBottom` values this module defines) to know which rows to discard from each overlapping shot.

## Notes

- The last offset in `stepsFor` **intentionally overlaps** the previous one; the stitcher is expected to overwrite that overlap with identical rows. Do not "fix" the off-by-one.
- `classifyFixed` uses `<= 0` for top-edge and `>= viewport.height` for bottom-edge, so an element flush against an edge (no sub-pixel gap) still counts as touching.
- The "half the viewport wide" threshold is the only width check; a narrow tall bar pinned to the top will be `other` even if it looks like a band visually.
- All exports are pure functions/types — no side effects, no module-level state — making this file safe to import in both the browser bundle and the Node test runtime.
