---
source: scripts/mutation/baseline.ts
sha256: a329a3a011038c470bf24c4523ce533288f72d41c8d8dcd93dd7f318073ef28e
generated_at: 2026-10-17T00:02:41.791187+00:00
model: ollama:qwen3.8:27b
---

# scripts/mutation/baseline.ts

## Purpose

Implements a per-file mutation-score ratchet on top of Stryker's global thresholds. Because Stryker's `high`/`low`/`break` settings apply to the entire mutate scope as one pooled number, a strong file can mask a weak one. This module records each file's score in a committed JSON file (`mutation-baseline.json`), then enforces that no file drops below its recorded value — while allowing scores to ratchet upward via `--update`. It exists so that widening the mutate scope does not dilute per-file signal into an unactionable average.

## Key elements

- **`MUTATION_BASELINE_PATH`** (`'mutation-baseline.json'`) — committed path of the baseline record, relative to repo root.
- **`SCORE_TOLERANCE`** (`1`) — how far below baseline a file may score before it is flagged as regressed; absorbs the Stryker timeout-vs-survivor race on loaded machines.
- **`KILLED`** / **`NOT_VIABLE`** — sets of Stryker mutant statuses. `KILLED` = `{'Killed','Timeout'}`; `NOT_VIABLE` = `{'RuntimeError','CompileError','Ignored'}` (excluded from the denominator).
- **`scoresFromReport(report)`** — walks a Stryker JSON report and returns a `Record<string, number>` of per-file scores (percentage, two decimals). Files where every mutant is non-viable are scored `100` to avoid a permanent false alarm.
- **`readReport(root?)`** — reads `reports/mutation/mutation.json` and returns per-file scores; throws a descriptive error if the file is absent.
- **`readBaseline(root?)`** / **`writeBaseline(baseline, root?)`** — read/write the committed `MutationBaseline` JSON (with 4-space indent + trailing newline).
- **`compareToBaseline(current, baseline?)`** — returns a sorted `FileComparison[]` with verdicts: `'held'`, `'improved'`, `'regressed'`, `'new'`, `'removed'`.
- **`missingFromReport(current, baseline?)`** — returns a sorted list of baseline files absent from the current report; used to refuse recording a partial (single-file) Stryker run.
- **`nextBaseline(current, baseline?)`** — computes the baseline to commit: for each file in `current`, takes `max(oldScore, newScore)`; new files are recorded at whatever they first measured. Scores never move down on their own.
- **`formatUnrecorded(comparisons)`** / **`formatRegressions(comparisons)`** — human-readable multi-line strings summarising new-file entries and regressed files respectively; return `''` when there is nothing to report.
- **Interfaces**: `MutationReport`, `MutationBaseline`, `FileComparison`; **type**: `FileVerdict`.

## Relationships

- **`stryker.config.json`** — its `jsonReporter` plugin is the source of `reports/mutation/mutation.json`, which `readReport` parses. The `mutate` glob in that config determines the file population the baseline tracks.
- **`scripts/mutation/check-baseline.ts`** — the "check" entry point that imports `readReport`, `readBaseline`, `compareToBaseline`, `missingFromReport`, `formatUnrecorded`, and `formatRegressions` to decide pass/fail in CI.
- **`scripts/mutation/pull-baseline.ts`** — the "update" (`--update`) entry point that imports `readReport`, `readBaseline`, `missingFromReport`, `nextBaseline`, and `writeBaseline` to rewrite the baseline file.
- **`github/workflows/mutation.yml`** — the CI workflow that invokes the check (and optionally the update) scripts, making the ratchet a merge gate.
- **`tests/unit/scripts/mutation/baseline.spec.ts`** — unit tests exercising the scoring, comparison, ratchet, and formatting logic in this file.

## Notes

- **Ratchet is one-directional.** `nextBaseline` uses `Math.max(old, new)`; a regression keeps the *higher* old value so the file stays failing until genuinely fixed. Lowering a baseline is an explicit human decision in a commit.
- **Partial-report guard.** A Stryker run scoped to a single file produces a report with only that file's keys. `missingFromReport` lets the update script refuse to write, preventing silent loss of all other baselines.
- **`Timeout` counts as killed.** This follows Stryker's own convention (a hanging mutant was detected). The `SCORE_TOLERANCE` of 1 point exists because whether a slow mutant is recorded as `Timeout` or a survivor is machine-load-dependent (noted in `stryker.config.json` for `src/infrastructure/http/index.ts`).
- **Non-viable mutants are excluded from the denominator**, not scored as killed or survived. A file where every mutant is non-viable gets a score of `100`, not `0`.
- **`generatedAt`** is an ISO-8601 timestamp written on every baseline update, making a stale baseline visible in a diff.
- **The backend has its own copy** of this module (same shape plus a `MUTATION_PROFILES` second scope). The two are not compared programmatically — diff by hand when changing one.
