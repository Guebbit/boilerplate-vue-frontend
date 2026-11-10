---
source: tests/unit/scripts/e2e/shard-verdict.spec.ts
sha256: f2ae3beeb36cc713fe3fce1b6c7b32ea52da900615464701e19e896375d0ea19
signature: 4d7afb59d7cb661ddfd94abb0c108f5237cbeab813c69b3b763ce8ac002973c2
generated_at: 2026-11-10T08:17:58.630612+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/shard-verdict.spec.ts

## Purpose

Unit tests for the shard-verdict logic that decides whether a parallel Cypress test shard succeeded. A shard passes only if it exited 0, was not killed by a signal, did not hang, and finished every assigned spec. This file exercises both the verdict decision (`judgeShard`) and the Cypress-output parser (`countFinishedSpecs`) that feeds it.

## Key elements

- **`healthy`** — A `ShardOutcome` fixture representing a passing shard (exit 0, no signal, not hung, 2/2 specs ran). Every `judgeShard` test spreads this and overrides one field.
- **`describe('judgeShard')`** — Six cases covering: clean pass; non-zero exit code; killed by signal (even with exit 0); hung shard (takes priority over the SIGKILL the kill produces); exit 0 with fewer specs ran than assigned; exit 0 with no parsable summary at all.
- **`describe('countFinishedSpecs')`** — Six cases covering: counting spec rows regardless of ✔/✖/− result; millisecond-duration rows; a wrapped two-line spec name counted once; two rows with the same truncated name counted as 2; only the table after the *last* `(Run Finished)` marker is parsed; "Running:" progress lines are ignored.
- **`summary`** (local constant) — A realistic multi-row Cypress `(Run Finished)` table (3 specs, one passing, one failing, one skipped) used as the primary input for parser tests.

## Relationships

- **`scripts/e2e/shard-verdict.ts`** (sibling source module) — The file under test. This spec imports `judgeShard`, `countFinishedSpecs`, and the `ShardOutcome` type from it. No other file is involved.

## Notes

- Verdict priority is implicit in the hung test: when `hung: true` and a signal is present, the reason is `HUNG: no output for N min`, not the signal. If you change the priority in `shard-verdict.ts`, that test is the one to update.
- `countFinishedSpecs('')` returns 0, which the "no summary" test uses to simulate a shard that produced no parseable output. This means an empty-string output is indistinguishable from "zero specs finished" — the verdict treats both as failure.
- The parser tests rely on exact Unicode box-drawing characters (`│`, `┌`, `└`, `┘`) and the `(Run Finished)` marker string. If Cypress changes its output format, these fixtures will silently stop matching.
