---
source: scripts/testing/report-results.ts
sha256: ba6bf04e717d14302aa557c39df86cdf070af3c27a7679d9571503127200ad00
generated_at: 2026-10-17T00:03:57.844593+00:00
model: ollama:qwen3.8:27b
---

# scripts/testing/report-results.ts

## Purpose

CLI script (`npm run test:report`) that reads a runner's JSON test report (Jest `--json` or Vitest `json` reporter) and prints three things a raw log does not: which **module** owns each failure, a per-module cost table, and where the time went. It exists to give a module-shaped view of test results in a codebase that is organised around deletable modules but otherwise only exposes layer-shaped or flat tooling.

## Key elements

- **`bucketOf(file)`** — Maps a test-file path to a bucket label via three regexes: `src/modules/<name>/` → module name; `tests/<layer>/` → `(layer)`; `src/<area>/` → `(area)`; else `(other)`.
- **`readReport(file)`** — Reads and parses the JSON file; exits 2 with a hint if the file is missing.
- **`Report` / `SuiteResult`** — Interfaces describing the subset of the Jest/Vitest JSON shape the script actually reads (`testResults[]` → `assertionResults[]`).
- **Bucket aggregation loop** — Single pass over `testResults`, accumulating suites, tests, failures, and millisecond duration per bucket into a `Map<string, Bucket>`.
- **Output sections** (all via `console.log`):
  - Headline totals (tests, suites, passed/failed/pending, suite-time).
  - Per-bucket table (modules first alphabetically, then layer buckets).
  - `slowest suites` — top 8 by duration.
  - `slowest tests` — top 8 individual assertions by duration.
  - `failures` — every failed assertion with bucket, file, name, and first failure line (only printed when non-empty).

## Relationships

None — the dependency graph lists no neighbors. The script depends only on `node:fs`, `node:path`, and the JSON file on disk.

## Notes

- **Shared script, no enforcement.** Byte-identical copies live in `boilerplate-node-backend` and `boilerplate-vue-frontend`. It is deliberately *not* in `SHARED_FILES`; keeping them in sync is a manual `diff` obligation.
- **Always exits 0.** The script *reads* a report the runner already gated on; a non-zero exit here would duplicate or contradict that verdict.
- **`process.cwd()` over `__dirname`/`import.meta.url`.** Required because the same file must run under both CommonJS and ESM. The trade-off is that the script must be launched from the package root (the only invocation path is `npm run …`).
- **Suite time ≠ wall clock.** The headline "suite time" sums per-suite `endTime − startTime`, which is inflated by parallel workers.
- **`SLOWEST = 8`** — both the slowest-suites and slowest-tests lists are capped at 8 rows.
- **JSON, not JUnit, on purpose.** JSON needs no extra dependency on either runner and carries strictly more detail (per-assertion durations, ancestor titles, full messages). JUnit would only be added later if PR-line annotations become necessary.
