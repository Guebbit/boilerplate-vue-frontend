---
source: tests/unit/scripts/e2e/flaky-report.spec.ts
sha256: 5e1d166395b8791ebeb78b4564b833e3e52a2156eba114a17eedac8017c96a9b
generated_at: 2026-10-17T02:42:47.886771+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/flaky-report.spec.ts

## Purpose

Unit tests for the flaky-report module that surfaces which e2e tests passed only on a retry. It pins the filter rule (a first-attempt pass and a total failure are *not* flaky), verifies the JSONL file round-trip, and checks the CI-aware output formatting.

## Key elements

- **`scratch` / `reportFile()`** – tracks temp directories created per test and returns a path inside one (`<tmpdir>/flaky-report-*/nested/flaky.jsonl`); an `afterEach` hook removes every directory in `scratch`.
- **`ENTRY`** – a single `FlakyTest` fixture (`a.cy.ts › cart › adds`, attempt 2) reused across cases.
- **`describe('flakyTestsIn')`** – asserts the filter: retry-passes are kept with a joined title; first-attempt passes and all-attempts-failures are dropped.
- **`describe('the report file')`** – covers `recordFlakyTests` (append semantics across calls), `readFlakyTests` (empty file → `[]`, malformed lines skipped without throwing), and `resetFlakyReport` (clears the file).
- **`describe('formatFlakyReport')`** – verifies empty input yields `[]`, CI mode emits GitHub `::warning` annotations, and non-CI mode emits a plain indented list.

## Relationships

- **`scripts/e2e/flaky-report.ts`** – the sole module under test. This spec imports `flakyTestsIn`, `formatFlakyReport`, `readFlakyTests`, `recordFlakyTests`, `resetFlakyReport`, and the `FlakyTest` type from it. All assertions here validate that module's public API.

## Notes

- Tests never touch the real `reports/` directory; every file I/O goes through a fresh `mkdtempSync` path under the OS temp dir.
- The `scratch` array is spliced-and-cleaned in `afterEach` to handle multiple `reportFile()` calls within a single test.
- The "skips a line it cannot parse" test appends a broken JSON line with `flag: 'a'` to simulate a partially-written concurrent shard; `readFlakyTests` must tolerate it.
- `formatFlakyReport` is expected to return an array of strings (line 0 = summary header, line 1+ = per-test entries), not a single string.
