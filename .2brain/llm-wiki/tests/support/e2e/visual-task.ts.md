---
source: tests/support/e2e/visual-task.ts
sha256: 85821c224715497f4f97612785f163da8ed7252951002fb48b1db753d5ef731f
generated_at: 2026-10-17T02:27:51.982611+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/visual-task.ts

## Purpose

Implements the image-comparison logic behind `cy.compareSnapshot()`. It runs in Cypress' Node process (the browser cannot read baseline files from disk) and decides whether a screenshot matches its committed baseline using `pixelmatch`. The comparison is hand-rolled rather than plugin-based so that the two tolerance knobs and the missing-baseline behaviour are visible and adjustable in this file.

## Key elements

- **`PIXEL_THRESHOLD` (0.15)** – Per-pixel colour tolerance passed to `pixelmatch`; absorbs antialiasing and sub-pixel font-rendering variance.
- **`MAX_DIFFERING_RATIO` (0.002)** – Maximum fraction of the image that may differ before the snapshot is considered a regression.
- **`CompareOptions` (interface, exported)** – Describes one comparison: snapshot `name`, `actualPath` (screenshot just written by Cypress), `specRelative` (repo-relative spec path, used to locate `__snapshots__/`), `diffDirectory`, and `update` flag.
- **`CompareResult` (interface, exported)** – Return value: `passed` boolean plus a human-readable `message` for the test's assertion.
- **`compareSnapshot(options)` (function, exported)** – The single entry point. Three branches:
  1. No baseline exists (or `update` is true) → writes the baseline, returns `passed: true`.
  2. Baseline and actual have different dimensions → returns `passed: false` immediately (a size change is itself a layout regression).
  3. Same dimensions → runs `pixelmatch`, computes the differing-pixel ratio, passes if ≤ `MAX_DIFFERING_RATIO`; otherwise writes a diff PNG to `diffDirectory` and returns `passed: false`.

## Relationships

- **`cypress.config.ts`** – Registers `compareSnapshot` as a Cypress Node task (`cy.task('compareSnapshot', …)`). The spec-side `cy.compareSnapshot()` wrapper calls `cy.task('compareSnapshot', options)` which dispatches into this file's exported function. This is the only runtime boundary between the browser context (where the screenshot is taken) and the Node context (where file I/O and pixel comparison happen).

## Notes

- Baselines live in a `__snapshots__/` folder **beside the spec file** (resolved via `specRelative`). Deleting a spec's directory also deletes its baselines — they are intentionally co-located.
- Path resolution relies on `process.cwd()` being the repo root, the same assumption made by `scripts/testing/report-results.ts`. This holds for anything launched via `npm run`.
- The "no baseline → create and pass" behaviour means a first run can never fail. The meaningful review happens when a committed baseline changes in a pull request.
- When a diff is produced, the failure message includes the absolute path to the `.diff.png` file and the command (`npm run test:e2e:visual:update`) to re-record.
- Both tolerance values are deliberately loose; the file's doc comment argues that a visual test which fails on rendering noise gets baselines re-approved without inspection, making it worse than absent.
