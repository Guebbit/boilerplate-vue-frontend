# scripts/mutation-baseline.ts

## Purpose

Implements a per-file mutation-score ratchet to compensate for Stryker's lack of per-file thresholds. It reads a Stryker JSON report, compares each file's score against a committed baseline (`mutation-baseline.json`), and enforces that scores never silently drop. Baselines only move up on `--update`; lowering one is a deliberate human decision.

## Key elements

- **`SCORE_TOLERANCE`** (`1`) — minimum point drop before a file counts as regressed; absorbs the timeout/survivor measurement race.
- **`MUTATION_BASELINE_PATH`** — constant path (`mutation-baseline.json`) where the committed baseline lives.
- **`scoresFromReport(report)`** — extracts a per-file kill-percentage from a Stryker JSON report. Files where every mutant is non-viable (`RuntimeError`, `CompileError`, `Ignored`) are scored `100`.
- **`readReport(root?)`** — reads and parses `reports/mutation/mutation.json`; throws a helpful error if the file is absent.
- **`readBaseline(root?)`** — reads `mutation-baseline.json` or returns `undefined` if it does not exist yet.
- **`writeBaseline(baseline, root?)`** — serializes a `MutationBaseline` to disk (4-space indent + trailing newline).
- **`compareToBaseline(current, baseline?)`** — returns a sorted `FileComparison[]` with verdicts: `new`, `removed`, `regressed`, `improved`, or `held`.
- **`missingFromReport(current, baseline?)`** — lists baseline files absent from a partial report; used to refuse recording incomplete runs.
- **`nextBaseline(current, baseline?)`** — builds the next baseline, taking `max(old, new)` per file so scores only ratchet upward.
- **`formatRegressions(comparisons)`** — human-readable failure message; returns `''` when nothing regressed.
- **`MutationBaseline`**, **`FileComparison`**, **`FileVerdict`** — exported types consumed by the check script and tests.

## Relationships

- **`mutation-baseline.json`** — the committed data file this module reads and writes. Its schema is defined by the `MutationBaseline` interface exported here.
- **`scripts/check-mutation-baseline.ts`** — the CI entry point that imports the functions above (`readReport`, `readBaseline`, `compareToBaseline`, `missingFromReport`, `nextBaseline`, `writeBaseline`, `formatRegressions`) to gate or update the baseline.
- **`tests/unit/scripts/mutation-baseline.spec.ts`** — unit tests exercising the scoring, comparison, and baseline-building logic in isolation.

## Notes

- A file whose mutants are all `RuntimeError`/`CompileError`/`Ignored` gets a score of `100`, not `0` — it has no testable surface, so treating it as untested would create a permanent false alarm.
- `Timeout` mutants count as **killed** (Stryker convention); `RuntimeError` and `CompileError` are excluded from the denominator entirely.
- `missingFromReport` exists specifically to guard against a partial `stryker run --mutate '<single file>'` accidentally wiping the rest of the baseline when recorded. Running a partial mutation is fine; *recording* it is not.
- The backend repo mirrors this file; keep the two in sync if logic changes.
- `SCORE_TOLERANCE` is intentionally tiny (1 point). It is a measurement error bar, not a performance budget.
