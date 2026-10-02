---
source: scripts/mutation/check-baseline.ts
sha256: 1e64943f931e07486d11f7a770590ef37f9b285182218e868faec1d119492adb
generated_at: 2026-10-02T11:39:33.979676+00:00
model: ollama:qwen3.8:27b
---

# scripts/mutation/check-baseline.ts

## Purpose

CLI entry point for the per-file mutation-coverage ratchet. It reads the latest Stryker JSON report and a stored baseline, then either **checks** (default) that no file has regressed, or **updates** the baseline (`--update`). It deliberately never invokes Stryker itself so the expensive test run and the cheap gate can be split across CI steps.

## Key elements

- **`--update` flag** (from `process.argv`) — switches the script from check-only to baseline-recording mode.
- **`readReport` / `readBaseline`** — load the current Stryker report and the persisted baseline. A missing report triggers `exit 2`.
- **`compareToBaseline`** — produces per-file verdicts: `held`, `improved`, `new`, `removed`, `regressed`.
- **`missingFromReport`** — guards `--update` against a *partial* Stryker run (e.g. `--mutate 'some/file.ts'`) that would otherwise silently drop unmeasured files from the baseline.
- **`nextBaseline`** — computes the next baseline state; always keeps the **higher** of old and new scores so a regressed file stays failing even after `--update`.
- **`writeBaseline`** — persists the baseline to `MUTATION_BASELINE_PATH`.
- **`formatRegressions` / `formatUnrecorded`** — build human-readable error blocks printed to `stderr` on failure.
- **Exit codes** — `0` pass (or first-time recording), `1` regression / unrecorded file / partial-report guard, `2` no report found.

## Relationships

- **`scripts/mutation/baseline.ts`** — sole import target. Supplies every function this CLI orchestrates (`compareToBaseline`, `readReport`, `readBaseline`, `writeBaseline`, `nextBaseline`, `missingFromReport`, formatters, and the `MUTATION_BASELINE_PATH` constant). This file contains no domain logic of its own; it is a thin argument-parsing / I/O / exit-code wrapper.

## Notes

- **Partial-run guard is one-directional.** It only fires on `--update`; a plain check with a missing baseline entry reports the file as *unrecorded* (exit 1) rather than erasing data.
- **Improved and removed files are always printed**, even on a passing run, so a green CI log is distinguishable from a check that silently does nothing.
- **`--update` writes the baseline even when regressions exist**, but because `nextBaseline` keeps the higher score, regressed files remain failing until their coverage is restored.
- A `new` (unrecorded) file **cannot pass** a plain check — it must be explicitly recorded with `--update` (referenced as FA125 in the source).
- The shebang is `tsx`; the file is run directly via `npm run test:mutation:check` / `test:mutation:baseline` rather than compiled.
