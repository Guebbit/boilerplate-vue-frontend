# scripts/check-mutation-baseline.ts

## Purpose

CLI entry point for the per-file mutation-testing ratchet. It compares the latest Stryker report (`reports/mutation/mutation.json`) against the recorded baseline (`mutation-baseline.json`) and exits non-zero if any file's mutation score has dropped. It can also rewrite the baseline (`--update`), but only for improved or new files—the ratchet never lowers a recorded score.

## Key elements

- **`--update` flag** — toggles baseline-writing mode. Without it the script is read-only.
- **`readReport` / `readBaseline` / `writeBaseline`** — imported I/O helpers; the script itself contains no file-system logic.
- **`compareToBaseline(current, baseline)`** — produces a per-file comparison with a `verdict` (`held`, `improved`, `new`, `removed`).
- **`missingFromReport(current, baseline)`** — returns baseline files absent from the current report; used as a guard against recording a partial Stryker run.
- **`nextBaseline(current, baseline)`** — computes the next baseline value; keeps the *higher* of the two scores per file so regressions don't overwrite the ratchet.
- **`formatRegressions(comparisons)`** — returns a human-readable summary of regressed files, or `null`/falsy if there are none.
- **Exit codes** — `0` pass, `1` regression detected (or partial-report guard tripped during `--update`), `2` report file missing/unreadable.

## Relationships

- **`scripts/mutation-baseline.ts`** — sole import source. Provides all domain logic (comparison, baseline arithmetic, file I/O, the `MUTATION_BASELINE_PATH` constant). This file is a thin CLI layer over that module and contains no business logic of its own beyond the partial-report guard and console output.

## Notes

- **Does not run Stryker.** The script assumes the report already exists; `npm run test:mutation` must be invoked separately. This split is deliberate so CI can run Stryker and the gate in separate steps and so the check itself is cheap enough to run twice.
- **Partial-report guard fires only in `--update` mode.** A read-only check against a partial report still works; the guard exists to prevent *recording* a narrowed scope (e.g. `--mutate 'one/file.ts'`) which would silently drop unmeasured files from the baseline.
- **`nextBaseline` is ratchet-only.** Even with `--update`, a regressed file retains its old (higher) score in the baseline, so it keeps failing until the score is actually restored.
- **New and improved files are printed on a passing run** so a silent `0` exit doesn't look identical to a broken check.
