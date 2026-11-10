---
source: scripts/mutation/check-baseline.ts
sha256: 50af15ac4fa09d6d9f57f6d5fff52c8ab24e5bbdb38caa35bcf334bbdca7815a
signature: 1ab324b37e62a2546d6b9f88671a04df711b71af5377ba011f3995348eedfccb
generated_at: 2026-11-10T02:45:22.719948+00:00
model: ollama:qwen3.8:27b
---

# scripts/mutation/check-baseline.ts

## Purpose

CLI entry point for the per-file mutation-score ratchet. It reads the latest Stryker JSON report, compares each file's score against the committed `mutation-baseline.json`, and either gates the run (exit 1 on regression or unrecorded file) or records improvements/new files (`--update`). It deliberately does **not** invoke Stryker itself so a CI pipeline can split the expensive run and the cheap gate into separate steps.

## Key elements

- **`--update` flag** – toggles between check-only mode (default) and record mode (writes the baseline).
- **`readReport()` / `readBaseline()`** – load `reports/mutation/mutation.json` and `mutation-baseline.json` respectively (both from `./baseline`).
- **`compareToBaseline(current, baseline)`** – returns a per-file array of verdicts: `held`, `improved`, `new`, `removed`, `regressed`.
- **`missingFromReport(current, baseline)`** – identifies files present in the baseline but absent from the report (partial-run detection).
- **`formatRegressions()` / `formatUnrecorded()`** – build human-readable failure messages; `formatUnrecorded` is suppressed under `--update`.
- **`nextBaseline(current, baseline)`** – merges the two score maps, keeping the **higher** score per file so the ratchet never moves down.
- **`writeBaseline()`** – persists the new baseline JSON.
- **`MUTATION_BASELINE_PATH`** – constant holding the baseline file path, reused in log messages.
- **Exit codes** – `0` pass, `1` regression or unrecorded file, `2` no report found (usage error).

## Relationships

- **`scripts/mutation/baseline.ts`** – sole import source. All domain logic (reading/writing the report and baseline, comparison, formatting, the ratchet merge in `nextBaseline`) lives there; this file is a thin CLI orchestrator that drives the call sequence, prints output, and sets the exit code.

## Notes

- **Partial-report guard.** Under `--update`, if the report covers fewer files than the baseline, the script refuses to write (exit 1) to prevent silently dropping files from the ratchet.
- **Ratchet only goes up.** `nextBaseline` keeps `max(baseline, current)` per file, so a regressed file retains its old (higher) score and keeps failing until fixed.
- **Silent pass is a failure mode.** Improved and removed files are always printed, even on a passing run, so a no-op check is visually distinguishable from a real gate.
- **New files.** In check mode a file with no baseline entry is treated as a failure (`formatUnrecorded`). Under `--update` it is recorded and the run succeeds.
- **First-run bootstrap.** If no baseline file exists yet, the script writes one from the current report and exits 0, regardless of `--update`.
