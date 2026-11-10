---
source: scripts/e2e/flaky-report.ts
sha256: f2ffa1d0ae05adc9bca01f5490231d8f5f700f49e044de6fff16c16948940e09
signature: cde357fec283d85514e7dbe8a5ca91d8863999f08e793ac045a16c1bfca43291
generated_at: 2026-11-10T02:32:43.344234+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/flaky-report.ts

## Purpose

Collects and reports e2e tests that passed only on a retry (i.e., are flaky). It is the reporting half of the retry allowance configured in `cypress.config.ts`: instead of letting a retry silently turn a red test green, this module records every retry-pass in a shared JSONL file and prints them as warnings at the end of the run — visible on the PR but never causing a failure.

## Key elements

- **`FLAKY_REPORT_FILE`** — Resolved path to `reports/e2e/flaky.jsonl`; the single shared file all shards append to.
- **`FlakyTest`** — Shape of one recorded entry: `spec`, `title`, `attempts` (≥ 2).
- **`TestResultLike`** — Minimal structural subset of Cypress' per-test result (`title[]`, `state`, `attempts[]`) so the module doesn't import Cypress types.
- **`flakyTestsIn(spec, tests)`** — Filters a spec's results down to tests whose final state is `passed` but which required more than one attempt.
- **`recordFlakyTests(entries, file?)`** — Appends entries as one-JSON-object-per-line. No-op (and no directory creation) when the list is empty.
- **`resetFlakyReport(file?)`** — Deletes the report file (with `force`) so a new run starts clean.
- **`readFlakyTests(file?)`** — Parses the JSONL back into `FlakyTest[]`; silently skips any line that fails `JSON.parse`.
- **`formatFlakyReport(entries, annotate)`** — Returns an array of printable lines. When `annotate` is true each entry is a GitHub Actions `::warning` annotation; otherwise a plain indented bullet.
- **`printFlakyReport(file?)`** — Convenience: reads, formats (annotation mode driven by `GITHUB_ACTIONS=true`), and `console.warn`s each line. Returns the entry count.

## Relationships

- **`cypress.config.ts`** — Its `after:spec` hook calls `flakyTestsIn` to extract retry-passes and `recordFlakyTests` to persist them during the run.
- **`scripts/e2e/run-shards.ts`** — The shard orchestrator calls `resetFlakyReport` before launching shards and `printFlakyReport` after all shards finish.
- **`scripts/e2e/report-flaky.ts`** — A dedicated script that reads and prints the report (uses `readFlakyTests` / `formatFlakyReport`).
- **`tests/unit/scripts/e2e/flaky-report.spec.ts`** — Unit tests that exercise every exported function, pointing `file` at a temp path to avoid touching the real report.

## Notes

- **Concurrency:** Four Cypress shards can write to the same file simultaneously. The JSONL format + single `appendFileSync` call is the only write pattern that guarantees no interleaved half-lines on POSIX filesystems.
- **Fail-soft by design:** A flaky-test report must never turn a run red. Empty lists write nothing, malformed lines are skipped on read, and `rmSync` uses `force: true` so a missing file is not an error.
- **Path resolution:** Uses `import.meta.dirname` (Node ≥ 20.11) rather than `__dirname` or `fileURLToPath`.
- **GitHub annotation format:** The `::warning file=…,title=…::message` line is what surfaces on the PR's Checks tab; the `annotate` flag is toggled by the `GITHUB_ACTIONS` env var, not a CLI argument.
