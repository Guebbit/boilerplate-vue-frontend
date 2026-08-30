# tests/unit/scripts/mutation-baseline.spec.ts

## Purpose

Vitest suite that pins the per-file mutation-score ratchet in `scripts/mutation-baseline.ts`. It verifies the core asymmetry — improvements raise the baseline, regressions never lower it — and the partial-run guard that prevents a single-file Stryker report from silently wiping the rest of the baseline. All cases run against synthetic Stryker-shaped reports so no real mutation run is required.

## Key elements

- **`report` (helper)** — Builds a minimal Stryker-shaped `{ files: { [path]: { mutants: [{ status }] } } }` object from `[file, statuses[]]` tuples.
- **`scores` / `baselineOf` (helpers)** — Shorthand for per-file score maps and `MutationBaseline` objects.
- **`FILE`, `OTHER`, `NEWCOMER`, `GONE` (constants)** — Stable path strings used as tuple keys so fixtures stay readable without triggering the naming-convention lint rule.
- **`describe('scoresFromReport')`** — Verifies scoring semantics: killed/timeout count as detected, non-viable mutants excluded from the denominator, zero-viable files score 100, all-survived files score 0 (not omitted).
- **`describe('compareToBaseline')`** — Covers every verdict: `regressed`, `improved`, `held`, `new`, `removed`, and the `SCORE_TOLERANCE` band that absorbs machine-load noise.
- **`describe('nextBaseline — the ratchet')`** — The critical group: asserts the baseline is monotonic (improvements recorded, regressions ignored, new files captured at first measurement, dropped files removed, `generatedAt` stamped).
- **`describe('formatRegressions')`** — Checks that the human-facing message names the file, shows both numbers, and points to the Stryker HTML report and the `test:mutation:baseline` escape-hatch command.
- **`describe('missingFromReport — the partial-run guard')`** — Ensures a report that omits baseline files is flagged, while a widened report (extra files) or a first run is not.

## Relationships

- **`scripts/mutation-baseline.ts`** — The sole subject under test. This spec imports `SCORE_TOLERANCE`, `compareToBaseline`, `missingFromReport`, `formatRegressions`, `nextBaseline`, `scoresFromReport`, and the `MutationBaseline` type from that module. No other production files are touched.

## Notes

- Fixtures use `[key, value]` tuples instead of object literals because literal file-path keys (e.g. `'src/a.ts'`) trip a project-wide naming-convention lint rule; the tuple approach avoids per-line `eslint-disable` noise.
- The suite intentionally avoids a real Stryker run. The file header calls this out: a test that needed a long mutation run "would never be run."
- `SCORE_TOLERANCE` is treated as a measurement error bar (timeout/survivor race), not as slack. A drop within tolerance must **not** produce a `regressed` verdict.
- The "KEEPS the higher value when a file regressed" case in the `nextBaseline` group is explicitly called out in the source as the single most important test in the file.
