---
source: scripts/testing/report-results.ts
sha256: 215d57941e3a8c10af0c3a7d7edffe97686747e44fff572c4f7f550da6b32667
generated_at: 2026-10-02T11:41:30.313603+00:00
model: ollama:qwen3.8:27b
---

# scripts/testing/report-results.ts

## Purpose

CLI script (invoked via `npm run test:report`) that reads a Jest/Vitest JSON test report and prints a human-readable summary: per-module pass/fail/duration table, slowest suites and tests, failure index, and optional per-module line coverage. It exists because the runner's raw log is flat and layer-shaped, while the codebase is organised by module — this script bridges that gap without altering how tests are run.

## Key elements

- **`REPO_ROOT`** / **`DEFAULT_REPORT`** — Resolved from `process.cwd()`; report path defaults to `reports/test-report.json`, overridable via `argv[2]`.
- **`bucketOf(file)`** — Maps a test-file path to a bucket label: `src/modules/<name>/` → the module name; `tests/<layer>/` → `(layer)`; `src/<area>/` → `(area)`; otherwise `(other)`.
- **`SuiteResult` / `Report`** — Interfaces matching the common JSON shape both Jest `--json` and Vitest's `json` reporter emit (`testResults[]` → `assertionResults[]`).
- **`readReport(file)`** — Loads and parses the JSON file; exits with code 2 and a helpful message if the file is missing.
- **`readCoverage(file)`** — Minimal lcov.info parser (`SF:`, `LF:`, `LH:`) that aggregates line-hit counts per bucket. Returns `undefined` when `coverage/lcov.info` does not exist.
- **`seconds(ms)`** — Formats milliseconds as e.g. `1.2s`.
- **`SLOWEST`** (8) — Row cap for the "slowest suites" and "slowest tests" sections.

## Relationships

No graph neighbors. The script is self-contained, depends only on `node:fs` and `node:path`, and is byte-identical across `boilerplate-node-backend` and `boilerplate-vue-frontend`.

## Notes

- **Shared by hand, not enforced.** This file is deliberately *not* listed in `SHARED_FILES` (`scripts/pairing/spec-identity.ts`). Keep the two copies in sync manually with `diff`.
- **`process.cwd()`, not `__dirname`.** Required so the same file works in both a CommonJS repo and an ESM repo. Only valid when invoked via `npm run` (package root as cwd).
- **Sorting puts parenthesised layer labels after module names** (e.g. `(integration)` sorts below `account`). This is intentional — modules are the primary unit of interest.
- **Coverage section is optional.** It appears only when `coverage/lcov.info` exists; a non-coverage run simply omits it. Per-file coverage floors remain the build gate in the runner configs.
- **Exit code 2** (not 1) is used for the "report file not found" error, distinguishing an operational mistake from a test failure.
- **Crashed suites** (no `startTime`/`endTime`) are treated as zero-duration rather than producing `NaN`.
