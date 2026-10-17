---
source: stryker.config.json
sha256: 3a41de9090dd541c614c32ee4bf9c717200b4bb3e219809f26a5be961ee0d75f
generated_at: 2026-10-17T01:59:08.108771+00:00
model: ollama:qwen3.8:27b
---

# stryker.config.json

## Purpose
Stryker Mutator configuration that defines which source files are subjected to mutation testing, how tests are executed (via Vitest), what reporters emit, and the quality thresholds that gate CI. It exists to make the mutation-testing run reproducible and tunable without touching test code.

## Key elements
- **`mutate`** — Glob allow-list for mutation targets (`src/i18n`, `src/infrastructure`, `src/ui/dialog.ts`, `src/app`, `src/kernel`, `src/modules/*`). Explicitly excludes `src/modules/*/index.ts` and all module test directories.
- **`ignorePatterns`** — Paths Stryker never touches (build output, reports, docs, temp dirs, `.claude/`).
- **`testRunner` / `vitest.configFile`** — Uses Vitest as the test runner with a dedicated config (`vitest.config.mutation.ts`), separate from the default project config.
- **`coverageAnalysis: "perTest"`** — Stryker only re-runs the tests whose coverage lines intersect a given mutant, keeping feedback fast.
- **`incremental: true`** — Limits mutation to files changed relative to the baseline (see `scripts/mutation/baseline.ts`).
- **`thresholds`** — `high` ≥ 80 %, `low` < 60 %, `break` at 60 %. A score below `break` causes a non-zero exit code.
- **`reporters` / `htmlReporter` / `jsonReporter`** — Emit human-readable HTML and machine-readable JSON into `reports/mutation/`.
- **`concurrency: 6` / `timeoutMS: 20000`** — Parallelism and per-run timeout for the mutation worker pool.
- **`$schema`** — Points at the local Stryker schema for editor autocomplete and validation.

## Relationships
- **`github/workflows/mutation.yml`** — The CI workflow that invokes Stryker (or a wrapper script) using this config; the `break` threshold is what makes the workflow fail.
- **`scripts/mutation/baseline.ts`** — Reads or writes the incremental baseline that `incremental: true` relies on, so only diffs against the last accepted state are mutated.

## Notes
- The dedicated `vitest.config.mutation.ts` (referenced under `vitest.configFile`) is **not** the project's main Vitest config; it likely strips e2e or heavy plugins to keep mutation runs fast.
- `src/ui/dialog.ts` is listed as a single file, not a directory glob — adding new files under `src/ui/` will **not** be mutated automatically.
- The `.claude/` entry in `ignorePatterns` keeps AI-assistant scratch files out of Stryker's file scanning.
