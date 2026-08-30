# tests/support/e2e/visual-task.ts

## Purpose

Implements the `compareSnapshot` logic behind `cy.compareSnapshot()`. It runs in Cypress' Node process (not the browser) so it can read/write baseline PNG files on disk. Written by hand instead of using a plugin so the tolerance thresholds and missing-baseline behaviour are visible and editable in one place rather than hidden behind plugin options.

## Key elements

- **`PIXEL_THRESHOLD`** (0.15) – per-pixel colour tolerance passed to `pixelmatch`; absorbs antialiasing and sub-pixel font differences between machines.
- **`MAX_DIFFERING_RATIO`** (0.002) – fraction of total pixels allowed to differ before the test fails. Separates minor rendering noise from an actual layout shift.
- **`CompareOptions`** (interface) – input contract: snapshot name, path to the actual screenshot, spec-relative path (determines where `__snapshots__/` lives), diff output directory, and an `update` flag.
- **`CompareResult`** (interface) – output contract: `passed` boolean and a human-readable `message` for the test's failure text.
- **`compareSnapshot(options)`** (exported function) – the core comparator. Three outcomes:
  1. No baseline exists (or `update: true`) → writes baseline, returns `passed: true`.
  2. Dimensions differ → fails immediately (a size change is itself a regression).
  3. Same size → runs `pixelmatch`; passes if differing ratio ≤ `MAX_DIFFERING_RATIO`, otherwise writes a diff PNG and fails.

## Relationships

- **`cypress.config.ts`** – registers `compareSnapshot` as a Cypress task (`cypress:compareSnapshot`) so the browser-side `cy.compareSnapshot()` can invoke it via `cy.task()`.
- **`package.json`** – defines the `test:e2e:visual:update` script referenced in the failure message; running it sets the `update` flag so baselines are re-recorded.
- **`docs/tools/visual-regression.md`** – user-facing documentation explaining how to author, run, and review visual snapshots; this file is the implementation it describes.

## Notes

- Baselines live in `__snapshots__/` **beside the spec file** (resolved from `specRelative`), not in a central directory. Deleting a module deletes its baselines with it.
- First run always passes and creates the baseline. The "real" review happens when a PR changes the committed image — not when the test first runs.
- The failure message includes the exact `npm run` command to re-record, making the fix path self-documenting in the test output.
- `process.cwd()` is assumed to be the repo root (same assumption as `scripts/report-test-results.ts`); this is guaranteed for anything launched via `npm run`.
