---
source: scripts/mutation/baseline.ts
sha256: e63e64e6135f4a5e96f39db8b3de16ca5c4334ca5555c7f1553d28ce6a234fb8
signature: 7d2f6d6f903751768f90de0f81a05159cccb5a33ac35860ca1e122d1e13a805f
generated_at: 2026-11-10T02:45:03.726705+00:00
model: ollama:qwen3.8:27b
---

# scripts/mutation/baseline.ts

## Purpose

Implements a **per-file mutation score ratchet** that replaces Stryker's global thresholds. Because Stryker only supports a single pass/fail gate across the entire mutation scope, this module records each file's score individually in `mutation-baseline.json` so that a strong file cannot mask a weak one. Scores may only ratchet upward; lowering a baseline is a human decision made in a commit.

## Key elements

- **`MUTATION_REPORT_PATH` / `MUTATION_BASELINE_PATH`** — file paths (relative to repo root) for the Stryker JSON report and the committed baseline.
- **`SCORE_TOLERANCE`** (1 point) — absorbs the timeout-vs-survivor race in Stryker so machine load doesn't cause spurious regressions.
- **`scoresFromReport(report)`** — converts a Stryker JSON report into per-file percentage scores. Files whose mutants are all non-viable (`RuntimeError`, `CompileError`, `Ignored`) are scored 100, not 0.
- **`readReport(root?)`** — reads and parses the Stryker JSON report; throws a helpful error if the file is missing.
- **`readBaseline(root?)`** / **`writeBaseline(baseline, root?)`** — read/write `mutation-baseline.json`.
- **`compareToBaseline(current, baseline?)`** — returns a sorted `FileComparison[]` with verdicts: `held`, `improved`, `regressed`, `new`, `removed`.
- **`missingFromReport(current, baseline?)`** — lists baseline files absent from a given report; used to refuse recording partial runs.
- **`nextBaseline(current, baseline?)`** — computes the baseline to commit: scores only move up (`Math.max` of previous and current), new files are recorded at their measured value.
- **`formatUnrecorded(comparisons)`** — human-readable warning listing files with no baseline entry.
- **`formatRegressions(comparisons)`** — human-readable warning listing files that dropped below their baseline.
- **`KILLED` / `NOT_VIABLE`** — Sets of Stryker mutant statuses; `Timeout` counts as killed, `RuntimeError`/`CompileError`/`Ignored` are excluded from the denominator.

## Relationships

- **`scripts/mutation/check-baseline.ts`** — the consumer of this module's comparison and formatting functions; orchestrates the pass/fail decision for CI.
- **`scripts/mutation/run-tests.ts`** — invokes Stryker and writes the JSON report that `readReport` consumes; the baseline functions run after it.
- **`scripts/mutation/pull-report.ts`** — fetches or materialises the Stryker report at `MUTATION_REPORT_PATH` before baseline comparison.
- **`tests/unit/scripts/mutation/baseline.spec.ts`** — unit tests covering `scoresFromReport`, `compareToBaseline`, `nextBaseline`, and the formatting helpers.

## Notes

- **Partial runs are dangerous to record.** `nextBaseline` builds its output from the report's keys only. If you feed it a single-file report, every other file is silently dropped. `missingFromReport` exists to guard against this; callers should refuse to call `writeBaseline` when it returns a non-empty list.
- **`generatedAt` is informational only** — nothing in the code auto-invalidates a stale baseline; it is there so a human can spot a baseline that is months old.
- **The backend has a parallel copy** of this logic (same shape plus a second mutation profile). The two are not compared programmatically; keep them in sync manually when changing this file.
- **Score rounding** uses `Math.round(x * 10_000) / 100` to produce two-decimal percentages, matching the tolerance granularity.
- A file whose every mutant is non-viable scores **100**, not 0, so it does not become a permanent ratchet failure.
