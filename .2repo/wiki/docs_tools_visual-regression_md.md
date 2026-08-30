# docs/tools/visual-regression.md

## Purpose

Documents the project's visual-regression testing layer: one baseline screenshot per module, pixel-compared against a committed PNG to catch layout, font, and styling defects that DOM-based tests cannot see. Also records the determinism requirements, tolerance settings, and the deliberate exclusion of these specs from the merge gate.

## Key elements

- **`cy.freezeForVisual()`** — injected command that pins the clock, zeroes all CSS transitions/animations, hides the text caret, and removes any overlay so the page is static at screenshot time.
- **`PIXEL_THRESHOLD` (0.15)** — per-pixel colour tolerance in `pixelmatch`; absorbs antialiasing / sub-pixel rendering variance.
- **`MAX_DIFFERING_RATIO` (0.002)`** — maximum fraction of image pixels allowed to differ before the test fails.
- **`compareSnapshot`** — the `cy.task` handler that runs in Node, loads baseline + current PNG, checks dimensions, runs `pixelmatch`, and writes a diff image on failure.
- **Baseline location convention** — `__snapshots__/<screen>.png` sits beside the `.visual.cy.ts` spec inside each module's e2e folder; deleting a module removes its baseline automatically.
- **Diff output** — written to `reports/visual-diff/` (gitignored); one central folder for all failing runs.
- **Visit-override readiness token (`_visitId`)** — per-navigation token in `tests/support/e2e/commands.ts` that prevents `cy.visit()` from resolving against the *outgoing* window's stale `_appReady` flag.

## Relationships

- **`tests/support/e2e/visual-task.ts`** — owns the `compareSnapshot` task implementation, `PIXEL_THRESHOLD`, and `MAX_DIFFERING_RATIO`. The doc here is the human-readable spec for what that file does.
- **`package.json`** — defines the two entry-point scripts: `test:e2e:visual` (run) and `test:e2e:visual:update` (re-record baselines). `scripts/run-e2e-shards.ts` reads the e2e glob and excludes `.visual.cy.ts` files so the merge gate stays DOM-only.
- **`docs/tools/unit-testing.md`** — sibling doc covering the DOM-assertion layer; this page is explicitly complementary (what unit/e2e DOM tests cannot see).

## Notes

- Visual specs are **not** in the PR merge gate and are **not** run in CI. Font rasterisation and sub-pixel hinting differ across machines enough to blow the 0.2 % budget; this is a known, accepted limitation.
- Adding a new module baseline is "free" (just exists beside the spec), but adding a *second* baseline to an existing module should be a deliberate decision — the doc treats unbounded screenshot growth as the primary failure mode of the suite.
- The visit-override bug (stale `_appReady` on the outgoing window) was the reason the per-visit `_visitId` token was introduced. Any future readiness mechanism must be scoped to a single navigation, not persisted on `window`.
- A quick health check: a genuine screenshot of this app has several thousand distinct colours. A baseline with only ~19 colours (or two baselines that are byte-identical) means the page never actually rendered.
