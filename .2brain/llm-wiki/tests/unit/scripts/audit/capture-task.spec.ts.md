---
source: tests/unit/scripts/audit/capture-task.spec.ts
sha256: 2117bae1171b547a7df051d1d51d8e2f778375caa9c8c80ccdc8040c8417bc75
signature: d147f130022f95fe61b83e8d1acad02cc13cb2ae9d618ccf9943a4714cd87579
generated_at: 2026-11-10T08:11:55.529225+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/audit/capture-task.spec.ts

## Purpose

Vitest unit tests for the three exported functions in `capture-task.ts` (`stitchDesignCapture`, `recordDesignShot`, `estimatedTokensOf`). The file verifies tile-stitching geometry, JSONL row-append/replace semantics, and the token-estimation formula used on the Node half of `cy.captureDesign()`.

## Key elements

- **`writePng(name, width, height)`** (local helper) — writes a solid-white PNG via `pngjs` into the scratch root and returns the absolute path; used to supply real image files to `stitchDesignCapture`.
- **`rowOf(id)`** (local helper) — returns a fully populated `DesignShot` object (fixed `module: 'cart'`, phone viewport, light theme) with only `id` varied; used as the fixture for `recordDesignShot`.
- **`describe('stitchDesignCapture')`** — asserts that a single-segment page yields exactly one tile with the expected dimensions, path pattern (`reports/audit/design-manual/capture/<shotId>/tile-1.png`), and that the on-disk PNG matches; also asserts a 3-segment page splits into >1 tile with no tile exceeding 1560 px.
- **`describe('recordDesignShot')`** — asserts JSONL append for new ids and in-place replacement (by `id`) for retried rows; verifies final row order and that the replaced row carries the updated `caseName`.
- **`describe('estimatedTokensOf')`** — asserts the result follows width × height / 750, rounded up (e.g. 390 × 1560 → 812).
- **`beforeEach` / `afterEach`** — creates / removes a `mkdtempSync` scratch directory per test.

## Relationships

- **`scripts/audit/design-manual/scripts/capture-task.ts`** — module under test; the spec imports `estimatedTokensOf`, `recordDesignShot`, and `stitchDesignCapture` from it.
- **`scripts/audit/design-manual/scripts/manifest.ts`** — provides the `DesignShot` type used to shape the `rowOf` fixture.

## Notes

- Tests read real PNG bytes back with `pngjs` to confirm dimensions — no image I/O is mocked.
- `recordDesignShot` persists as **JSONL** (one JSON object per line); the test parses by splitting on `'\n'` and filtering blanks.
- The scratch root is a real OS temp directory (not an in-memory fs), so `stitchDesignCapture` writes tiles into a genuine filesystem path under it.
- The max tile height of **1560 px** asserted in the stitching test is a behavior of `stitchDesignCapture`, not a constant defined in this file.
