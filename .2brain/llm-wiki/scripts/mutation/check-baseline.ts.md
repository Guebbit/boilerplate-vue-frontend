---
source: scripts/mutation/check-baseline.ts
sha256: 50af15ac4fa09d6d9f57f6d5fff52c8ab24e5bbdb38caa35bcf334bbdca7815a
generated_at: 2026-10-17T00:02:54.476767+00:00
model: ollama:qwen3.8:27b
---

# scripts/mutation/check-baseline.ts

## Purpose
CLI entry point for the per-file mutation ratchet. It reads the latest Stryker report (`reports/mutation/mutation.json`) and compares every file's mutation-coverage score against the committed `mutation-baseline.json`, exiting non-zero if any file regressed or has no baseline entry. With `--update` it records improvements and new files. It deliberately does **not** invoke Stryker, so a CI pipeline can split the expensive run and this cheap gate into separate steps.

## Key elements
- **`update`** – boolean derived from `process.argv.includes('--update')`; switches the script from check-only to check-and-record mode.
- **`readReport()` / `readBaseline()` / `writeBaseline()`** – I/O helpers imported from `./baseline`; this file orchestrates but contains no format logic.
- **`compareToBaseline(current, baseline)`** – returns a per-file array of `{ file, baseline, current, verdict }` where verdict is `'held' | 'improved' | 'new' | 'removed' | 'regressed'`.
- **`missingFromReport(current, baseline)`** – lists baseline files absent from the current report; used to guard against partial runs.
- **`nextBaseline(current, baseline)`** – computes the next baseline object, keeping the **higher** of baseline vs. current for each file (so a regression never lowers the bar).
- **`formatRegressions` / `formatUnrecorded`** – produce human-readable failure text for the two failure categories.
- **`MUTATION_BASELINE_PATH`** – constant for the committed baseline file path, used in log messages.
- **Exit codes** – `0` pass, `1` regressed/unrecorded, `2` report file missing (usage error).

## Relationships
- **`scripts/mutation/baseline.ts`** – sole dependency. All domain logic (report/baseline I/O, comparison, next-baseline computation, formatting) lives there. This file is a thin CLI shell that parses argv, calls those helpers in sequence, prints results, and sets the process exit code.

## Notes
- **Partial-run guard:** if `--update` is used and the report is missing files present in the baseline (e.g. a `--mutate 'src/x.ts'` scoped run), the script refuses to write and exits 1. This prevents accidentally erasing ratchet memory for unmeasured files.
- **Visible movement on pass:** improved and removed files are always printed, even when the run exits 0, so a passing run looks different from a broken/no-op check.
- **`new` verdict asymmetry:** on a plain check, a file with no baseline entry is a *failure* (exit 1); under `--update` it is recorded and the run still fails (exit 1) so the first recording is never silent.
- **First run** (no baseline file exists) always succeeds and writes the initial baseline, regardless of scores.
- **`--update` with regressions:** the baseline is still rewritten, but `nextBaseline` preserves the higher score for regressed files, so they remain failing until actually fixed.
