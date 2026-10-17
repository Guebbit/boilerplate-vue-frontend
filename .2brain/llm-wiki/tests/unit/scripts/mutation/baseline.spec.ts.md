---
source: tests/unit/scripts/mutation/baseline.spec.ts
sha256: 71cfd4282065a573a181e6ff12cfe805ca3620d17cb82e350afb5cd8e0e05f43
generated_at: 2026-10-17T02:44:39.020067+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/mutation/baseline.spec.ts

## Purpose

Unit tests for the per-file mutation-score ratchet implemented in `scripts/mutation/baseline.ts`. The spec exists to pin the ratchet's core asymmetry—improvements raise the baseline, regressions never lower it—and to lock in the scoring, comparison, formatting, and partial-run-guard behaviors so that a silent re-recording of a regression is caught before it can launder a drop.

## Key elements

- **`scoresFromReport` tests** — Verify that killed/timeout mutants count as detected, non-viable mutants (CompileError, RuntimeError, Ignored) are excluded from the denominator, a file with zero viable mutants scores 100, and an all-survived file scores 0 (not omitted).
- **`compareToBaseline` tests** — Cover every verdict: `regressed` (drop beyond `SCORE_TOLERANCE`), `improved`, `held`, `new` (file absent from baseline), `removed` (file in baseline but not in current report), and the no-baseline case where all files are `new`.
- **`nextBaseline` tests (the ratchet)** — The critical group: an improvement updates the baseline, a regression keeps the old (higher) value, new files are recorded at first-measured score, removed files are dropped, and the result is monotonic across successive runs. Also asserts `generatedAt` is a valid ISO timestamp.
- **`formatRegressions` tests** — Empty string when nothing regressed; otherwise the message names the file, both scores (two decimal places), the Stryker HTML report path, and the `test:mutation:baseline` escape-hatch command.
- **`formatUnrecorded` tests** — Silent when every file has a baseline entry; otherwise names the unrecorded file, its score, and the escape-hatch command.
- **`missingFromReport` tests (partial-run guard)** — Returns the list of baseline files absent from a partial report (refusing to re-record from those keys alone), returns empty when coverage is complete, wider, or when no baseline exists yet.
- **Fixture helpers** — `report`, `scores`, `baselineOf` build Stryker-shaped data from `[file, value][]` tuples to avoid lint issues with path-shaped object keys. Constants `FILE`, `OTHER`, `NEWCOMER`, `GONE` keep tuple literals readable.

## Relationships

- **`scripts/mutation/baseline.ts`** — Sole dependency under test. The spec imports `SCORE_TOLERANCE`, `compareToBaseline`, `missingFromReport`, `formatRegressions`, `formatUnrecorded`, `nextBaseline`, `scoresFromReport`, and the `MutationBaseline` type, exercising each in isolation against synthetic fixtures (no real Stryker run).

## Notes

- Fixtures are built from `[file, value][]` tuples rather than object literals because path-string keys (`'src/a.ts'`) trip the naming-convention lint rule in every fixture; the tuple approach sidesteps per-line lint disables.
- The tolerance (`SCORE_TOLERANCE`) is a measurement error bar for the timeout/survivor race, not slack—tests explicitly assert that a drop *within* tolerance does **not** produce a `regressed` verdict.
- The `nextBaseline` "keeps the higher value on regression" case is called out in-file as the single most important test: without it, `--update` would silently re-record every regression.
- `missingFromReport` is tested to confirm it does **not** block a widened mutate set (more files in report than in baseline)—only a narrowed set triggers the guard.
