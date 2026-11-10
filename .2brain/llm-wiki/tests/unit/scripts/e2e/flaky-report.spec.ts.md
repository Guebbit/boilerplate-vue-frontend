---
source: tests/unit/scripts/e2e/flaky-report.spec.ts
sha256: 5e1d166395b8791ebeb78b4564b833e3e52a2156eba114a17eedac8017c96a9b
signature: c78f72284fe9277f57e8ed517f1061b2b1080aa23999dee2cadd530c235aebb5
generated_at: 2026-11-10T08:16:17.888553+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/flaky-report.spec.ts

## Purpose

Unit tests for the `flaky-report` module. They verify the core filter (only tests that passed on a *later* attempt are flaky), the append/read/reset file-round-trip, and the CI-vs-local formatting of the report. The file exists to pin down the narrow "flaky" definition and ensure the report never crashes on malformed input.

## Key elements

- **`reportFile()`** – Helper that creates a fresh `mkdtempSync` directory under the OS temp path and returns a nested `nested/flaky.jsonl` path inside it. Tracks every created directory in `scratch` for teardown.
- **`scratch` / `afterEach`** – Accumulates temp dirs; `afterEach` removes them all recursively and splices the array.
- **`ENTRY`** – A single `FlakyTest` fixture (`a.cy.ts › cart › adds`, 2 attempts) reused across file-IO and formatting tests.
- **`describe('flakyTestsIn')`** – Asserts the filter: a test that passed on attempt 2 is kept; a first-attempt pass *and* a test that failed every attempt are both excluded.
- **`describe('the report file')`** – Covers append-accumulation (concurrent-shard simulation), no-op on empty writes, reset-to-empty, and graceful skip of an unparseable appended line.
- **`describe('formatFlakyReport')`** – Verifies CI mode emits a `::warning file=…,title=…` annotation per test plus a header line; non-CI mode emits a plain indented list; empty input yields an empty array.

## Relationships

- **`scripts/e2e/flaky-report.ts`** – The module under test. This spec imports `flakyTestsIn`, `recordFlakyTests`, `readFlakyTests`, `resetFlakyReport`, `formatFlakyReport`, and the `FlakyTest` type, exercising each in isolation against a temp-file path.

## Notes

- The "flaky" signal is intentionally narrow: *first-attempt pass* and *final failure* are both **not** flaky. The tests exist to guard against broadening that filter.
- File I/O is always against a throwaway temp directory; the real `reports/` path is never touched.
- The malformed-JSON test appends `{not json\n` with `flag: 'a'` after a valid entry, then expects `readFlakyTests` to return only the valid entry — i.e., the reader skips bad lines rather than throwing.
- `formatFlakyReport`'s CI branch embeds the test title and spec path as GitHub annotation parameters (`file=`, `title=`); the plain branch uses a two-space indent with `›` separators.
