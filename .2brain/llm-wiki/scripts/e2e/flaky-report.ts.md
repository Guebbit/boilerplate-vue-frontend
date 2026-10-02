---
source: scripts/e2e/flaky-report.ts
sha256: f2ffa1d0ae05adc9bca01f5490231d8f5f700f49e044de6fff16c16948940e09
generated_at: 2026-10-02T11:34:26.415344+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/flaky-report.ts

## Purpose

Collects and reports Cypress tests that passed only after a retry (i.e., were flaky). It is the visibility half of the trade made in `cypress.config.ts` (which allows one retry to keep contention from failing a run). The module is deliberately fail-soft: it surfaces flakiness as a warning annotation or plain list, never as a run failure.

## Key elements

- **`FLAKY_REPORT_FILE`** – Resolved path to `reports/e2e/flaky.jsonl`, the shared append-only report file (gitignored).
- **`FlakyTest`** – Interface: `{ spec, title, attempts }` describing one retry-pass.
- **`TestResultLike`** – Minimal structural view of a Cypress test result (`title`, `state`, `attempts`) so the module can be unit-tested without importing Cypress.
- **`flakyTestsIn(spec, tests)`** – Filters a spec's results for tests where `state === 'passed'` and `attempts.length > 1`; returns `FlakyTest[]`.
- **`recordFlakyTests(entries, file?)`** – Appends entries as one-JSON-object-per-line to the report file. No-op for an empty list.
- **`resetFlakyReport(file?)`** – Deletes the report file (`rmSync` with `force`) so a new run starts clean.
- **`readFlakyTests(file?)`** – Reads the JSONL file back; silently skips lines that fail to parse.
- **`formatFlakyReport(entries, annotate)`** – Produces printable lines. When `annotate` is true (GitHub Actions), each entry becomes a `::warning file=…` annotation for the PR checks page.
- **`printFlakyReport(file?)`** – Reads, formats (annotating when `GITHUB_ACTIONS === 'true'`), prints via `console.warn`, and returns the entry count.

## Relationships

- **`cypress.config.ts`** – Enables the single retry via `retries: { runMode: 1 }` and wires the `after:spec` hook that calls `flakyTestsIn` + `recordFlakyTests` for each spec.
- **`scripts/e2e/report-flaky.ts`** – End-of-run reporter; calls `printFlakyReport` (or `resetFlakyReport` for a fresh run) to display or clear the collected data.
- **`scripts/e2e/run-shards.ts`** – Launches up to four concurrent Cypress shards that all append to the same `FLAKY_REPORT_FILE`; this is the concurrency constraint that shapes the write strategy here.
- **`tests/unit/scripts/e2e/flaky-report.spec.ts`** – Unit tests exercising `flakyTestsIn`, `recordFlakyTests`, `readFlakyTests`, `formatFlakyReport`, and `printFlakyReport` in isolation.

## Notes

- **Concurrency-safe write by accident:** `appendFileSync` is used (not `appendFile`) because a single short synchronous write is the one operation that cannot interleave another shard's half-line. There is no locking; correctness relies on the write being small and atomic at the OS level.
- **Fail-soft everywhere:** `readFlakyTests` catches JSON parse errors per line and returns `[]` on missing file; `formatFlakyReport` returns `[]` for empty input; `printFlakyReport` never throws. The design contract is that flakiness reporting must not itself fail a CI run.
- **`title` is a flat string** in `FlakyTest` (joined with ` › `), not the array form Cypress uses. Consumers should not expect the raw `readonly string[]` shape.
- The report file lives under `reports/` (gitignored), so it is ephemeral and never committed.
