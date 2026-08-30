# mutation-baseline.json

## Purpose

Records the per-file mutation-testing kill score (as a percentage) captured at a point in time. It serves as a regression baseline: subsequent mutation-test runs can be diffed against these scores to flag files whose test effectiveness has dropped (or improved) without needing to re-derive expectations manually.

## Key elements

- **`generatedAt`** — ISO-8601 timestamp of when the snapshot was produced.
- **`files`** — A flat map of relative source-file paths (e.g. `src/infrastructure/http/client.ts`) to a numeric score (0–100). A score of `100` means every mutant in that file was killed; lower values indicate surviving mutants. Covers ~75 files across `app/`, `infrastructure/`, `kernel/`, and `modules/` (account, admin, cart, delivery, demo, feedback, inventory, orders, payments, products, realtime, users, wishlist).

## Relationships

- **`scripts/mutation-baseline.ts`** — The generator/comparer for this file. It presumably writes `mutation-baseline.json` after a full mutation-test run and reads it back to produce pass/fail or delta reports on subsequent runs.

## Notes

- The values are *snapshot* scores, not thresholds. A "correct" value depends on the codebase state at `generatedAt`; stale baselines will cause false regressions.
- Files not listed in `files` simply had no mutants (or were excluded from the run) — their absence is not an error.
- The file is regenerated wholesale; there is no incremental merge logic visible in the content.
