# stryker.config.json

## Purpose

Stryker Mutator configuration that defines which source files are subject to mutation testing, how tests are executed (via Vitest), where reports are written, and what quality thresholds gate the build. It exists to make mutation coverage a reproducible, configurable part of the project's quality pipeline.

## Key elements

- **`mutate`** — Glob patterns selecting the files under test: `src/infrastructure/**`, `src/ui/dialog.ts`, `src/app/**`, `src/kernel/**`, and `src/modules/*/**` (with exclusions for module `index.ts` barrel files and module test files).
- **`testRunner` / `vitest.configFile`** — Tells Stryker to run Vitest using the dedicated `vitest.config.mutation.ts` config (separate from the main test config).
- **`coverageAnalysis: "perTest"`** — Uses per-test coverage to cull mutants that are never exercised by any test, improving runtime.
- **`incremental: true`** — Only mutates files changed in the current commit/diff, keeping CI runs fast.
- **`thresholds`** — `high: 80`, `low: 60`, `break: 60`. A mutation score below 60% fails the run; between 60–80% it is flagged as "low."
- **`reporters` + output paths** — Writes HTML and JSON reports under `reports/mutation/`.
- **`concurrency: 6` / `timeoutMS: 20000`** — Runs up to 6 test batches in parallel; each mutation run times out after 20 s.
- **`ignorePatterns`** — Excludes build artifacts, coverage output, docs, and reports from Stryker's file scanning.

## Relationships

- **`github/workflows/mutation.yml`** — The CI workflow that invokes Stryker (e.g. `npx stryker run`), consuming the thresholds and report paths defined here to decide pass/fail and to publish the HTML report as a CI artifact.

## Notes

- The dedicated `vitest.config.mutation.ts` means mutation-test runs may resolve aliases or mocks differently from the standard Vitest config; changes to one don't automatically affect the other.
- `incremental: true` means a full-file mutation run only happens in non-incremental contexts (local dev, tag-based runs). In PR CI the effective scope shrinks to diffed files.
- The `mutate` array explicitly targets `src/ui/dialog.ts` while the rest of `src/ui` is *not* mutated—treat this as intentional scoping, not an oversight.
- Module `index.ts` files are excluded from mutation because they are re-export barrels; mutating them would produce meaningless mutants.
