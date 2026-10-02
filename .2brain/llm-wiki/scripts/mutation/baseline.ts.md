---
source: scripts/mutation/baseline.ts
sha256: e5869862461109521bf01b278dc2b9833b872c3f08a69c2cc6357516aa08099c
generated_at: 2026-10-02T11:39:12.638698+00:00
model: ollama:qwen3.8:27b
---

# scripts/mutation/baseline.ts

## Purpose

Implements a per-file mutation-score ratchet on top of Stryker's global thresholds. Stryker only supports `high` / `low` / `break` gates over the entire `mutate` scope, so a strong file can mask a weak one. This file records each file's score in `mutation-baseline.json`, then enforces that no file may drop below its last recorded value (within a small tolerance), while improvements are locked in. It is the scoring, comparison, and reporting logic; the CLI entry point lives elsewhere.

## Key elements

- **`SCORE_TOLERANCE`** (exported, `= 1`) — how many points a file may fall before it counts as a regression; absorbs the timeout/survivor race, not real weakening.
- **`scoresFromReport`** (exported) — converts a Stryker `MutationReport` into `Record<file, score>`; excludes `RuntimeError`/`CompileError`/`Ignored` mutants from the denominator; a file with zero viable mutants is scored 100.
- **`readReport`** (exported) — reads and parses `reports/mutation/mutation.json` from disk; throws a helpful error if the file is missing.
- **`readBaseline` / `writeBaseline`** (exported) — read/write `mutation-baseline.json` (4-space-indented JSON + trailing newline).
- **`compareToBaseline`** (exported) — returns `FileComparison[]` with verdicts: `held`, `improved`, `regressed`, `new`, `removed`. Uses `SCORE_TOLERANCE` for the regressed check.
- **`missingFromReport`** (exported) — returns sorted list of baseline files absent from the current report; used to refuse recording a partial run as a full baseline.
- **`nextBaseline`** (exported) — builds the next `MutationBaseline`; each file's score is `max(previous, current)` (the ratchet: scores only move up).
- **`formatUnrecorded` / `formatRegressions`** (exported) — produce human-readable, action-oriented CLI output; return `''` when nothing to report.
- **`KILLED` / `NOT_VIABLE`** (module-private) — sets of Stryker status strings; `Timeout` is treated as killed, `RuntimeError`/`CompileError`/`Ignored` are excluded from scoring.
- **`MutationBaseline` / `FileComparison` / `FileVerdict`** (exported interfaces/types) — shapes consumed by callers and tests.

## Relationships

- **`stryker.config.json`** — defines the `mutate` glob and the `jsonReporter` that writes `reports/mutation/mutation.json`, which `readReport` consumes. Changing `mutate` changes the file population and requires a coordinated `--update` re-baseline.
- **`scripts/mutation/check-baseline.ts`** — the CLI script that imports and orchestrates these functions (read → compare → format → optionally `nextBaseline` + `writeBaseline`).
- **`github/workflows/mutation.yml`** — CI workflow that runs the mutation test and the baseline check, gating the pipeline on regressions.
- **`tests/unit/scripts/mutation/baseline.spec.ts`** — unit tests covering `scoresFromReport`, `compareToBaseline`, `nextBaseline`, `missingFromReport`, and the formatters.

## Notes

- **Ratchet asymmetry:** `nextBaseline` uses `Math.max(before, current)`. A regression keeps the old (higher) score so the file keeps failing until genuinely fixed. Lowering a baseline is always a deliberate, in-commit human decision — never automatic.
- **Partial-run guard:** `missingFromReport` exists because `stryker run --mutate 'src/one.ts'` produces a single-file report. Recording that as a full baseline would silently drop every other file and launder any regression that occurred in the gap. Running a partial mutation is fine; *recording* it is refused.
- **Zero-viable-mutant files score 100**, not 0, to avoid a permanent false-alarm on the ratchet for files where Stryker found nothing to test.
- **`Timeout` is counted as killed** (Stryker's own convention). The 1-point tolerance exists specifically because whether a hanging mutant is recorded as `Timeout` vs. a survivor depends on machine load.
- **`NOT_VIABLE` includes `Ignored`** alongside `RuntimeError` and `CompileError`; all three are excluded from the denominator.
- The header comment notes the **backend repo has a parallel copy** of this file with an extra scope (`MUTATION_PROFILES`). The two are not compared programmatically — diff by hand when editing either.
