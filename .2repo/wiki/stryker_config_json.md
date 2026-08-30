# stryker.config.json

## Purpose

Configuration file for Stryker mutator, defining which source files are mutated, how tests are run (via Vitest), where reports are written, and what score thresholds must be met. It exists so that mutation testing runs consistently across local development and CI without ad-hoc CLI flags.

## Key elements

- **`testRunner` / `vitest`** — Stryker delegates test execution to Vitest using `vitest.config.mutation.ts` (a dedicated config, not the default `vitest.config.ts`).
- **`mutate`** — Glob list targeting `src/infrastructure`, `src/app`, `src/kernel`, and `src/modules/*/**` while explicitly excluding module `index.ts` barrels and module test directories.
- **`incremental`** — When `true`, Stryker only scores mutants on lines touched by the current change (requires git).
- **`coverageAnalysis: "perTest"`** — Stryker tracks which tests kill which mutants to prune redundant test executions.
- **`thresholds`** — `high: 80`, `low: 60`, `break: 60`. A score below 60 causes the process to exit non-zero.
- **`reporters`** — Emits HTML (`reports/mutation/index.html`), JSON (`reports/mutation/mutation.json`), clear-text, and progress output.
- **`concurrency: 6`** / **`timeoutMS: 20000`** — Parallelism cap and per-test timeout in milliseconds.
- **`ignorePatterns`** — Excludes `coverage/`, `reports/`, `dist/`, `docs/` from mutation and file-watching.

## Relationships

- **`github/workflows/mutation.yml`** — The CI workflow that invokes Stryker (typically via `npx stryker run`) and consumes the JSON report / exit code produced by this config to gate merges.
- **`scripts/run-mutation-tests.ts`** — A local/CI helper script that launches Stryker, picking up this config automatically (or passing it explicitly), and may post-process the `reports/mutation/` artifacts.

## Notes

- The `vitest.config.mutation.ts` file is separate from the standard Vitest config; changes to one do not affect the other.
- `incremental: true` means a full-repo score only appears when there are no pending changes (e.g., on a clean branch head). In CI, this typically resolves to the diff against the default branch.
- The `!src/modules/*/index.ts` exclusion exists because barrel files rarely contain logic worth mutating and can inflate the denominator with trivial mutants.
