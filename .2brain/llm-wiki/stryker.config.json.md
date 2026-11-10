---
source: stryker.config.json
sha256: 3a41de9090dd541c614c32ee4bf9c717200b4bb3e219809f26a5be961ee0d75f
signature: 3a41de9090dd541c614c32ee4bf9c717200b4bb3e219809f26a5be961ee0d75f
generated_at: 2026-11-10T06:34:43.852835+00:00
model: ollama:qwen3.8:27b
---

# stryker.config.json

## Purpose

Stryker Mutator configuration that defines which source files are subject to mutation testing, how tests are run (via Vitest), where reports land, and the quality thresholds that must be met. It is the single source of truth that the CI mutation workflow and local `npx stryker run` both consume.

## Key elements

- **`testRunner` / `vitest.configFile`** — Uses Vitest with a dedicated `vitest.config.mutation.ts` (separate from the normal config, likely to exclude e2e or speed up test execution during mutation).
- **`mutate`** — Glob patterns targeting `i18n`, `infrastructure`, `ui/dialog`, `app`, `kernel`, and `modules/*/*` while excluding each module's `index.ts` barrel file and all `tests/` directories.
- **`coverageAnalysis: "perTest"`** — Stryker skips mutations on lines not covered by the specific test that would catch them, reducing runtime.
- **`incremental: true`** — Only lines changed relative to the base branch are mutated, keeping CI runs fast.
- **`reporters`** — Emits HTML, clear-text, progress, and JSON reports; HTML and JSON are written to `reports/mutation/`.
- **`thresholds`** — `high: 80`, `low: 60`, `break: 60`. A mutation score below 60% causes the process to exit non-zero (CI failure).
- **`timeoutMS: 20000` / `concurrency: 6`** — Per-test timeout of 20 s and up to 6 concurrent test runners.
- **`ignorePatterns`** — Keeps Stryker from scanning build artifacts, docs, its own temp dirs, and the `.claude` directory.

## Relationships

- **`github/workflows/mutation.yml`** — The CI workflow that executes Stryker in a scheduled or push-triggered job. It reads this file (or passes the path) to invoke `npx stryker run`, uploads the `reports/mutation/` artifacts, and uses the non-zero exit code from the `break` threshold to fail the pipeline.

## Notes

- The `incremental` flag means mutation scores are only meaningful against the diff; a 100% score on an unchanged file is trivially achieved.
- The separate `vitest.config.mutation.ts` is not defined in this repo's standard Vitest config—check it for any plugin or include/exclude differences before debugging "test not found" errors under Stryker.
- Module barrel files (`src/modules/*/index.ts`) are explicitly excluded from mutation; re-exports in those files will never be tested for mutation resistance.
