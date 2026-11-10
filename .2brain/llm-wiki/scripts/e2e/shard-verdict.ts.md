---
source: scripts/e2e/shard-verdict.ts
sha256: 7b08c843bd0e4a33e361b09ddd57ee08c0b3fd9e4ff962f5e57ba89e8d582b68
signature: 351bba0e2c0118b9c5164476b2053a80082d1887f3701f6d523150cbe8d0c669
generated_at: 2026-11-10T02:36:18.629480+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/shard-verdict.ts

## Purpose

Pure decision logic that turns a finished Cypress shard's raw outcome (exit code, signal, hang status, spec counts) into a single pass/fail verdict. It exists because a shard can exit 0 while most of its specs never ran (killed externally, hung, or silently aborted), so the exit code alone is an unreliable gate.

## Key elements

- **`ShardOutcome`** (interface) – Structured description of a finished shard: `code`, `signal`, `hung`, `quietMinutes`, `assigned`, `ran`.
- **`ShardVerdict`** (type) – Discriminated union: `{ ok: true }` or `{ ok: false; reason: string }`.
- **`countFinishedSpecs(output: string): number`** – Scans the text after the *last* `(Run Finished)` marker and counts Cypress summary-table rows via the `SUMMARY_ROW` regex.
- **`judgeShard(outcome: ShardOutcome): ShardVerdict`** – Applies an ordered set of checks (hung → signal → non-zero exit → `ran < assigned`) and returns the first failure reason, or `{ ok: true }`.
- **`SUMMARY_ROW`** (internal regex) – Matches a single row of Cypress' `│ ✔ spec-name time … │` summary table.
- **`RUN_FINISHED`** (internal constant) – The literal `'(Run Finished)'` marker Cypress prints once before its final summary table.

## Relationships

- **`scripts/e2e/run-shards.ts`** – The runner that spawns shard processes, collects the fields of `ShardOutcome`, and calls `judgeShard` (and likely `countFinishedSpecs`) to decide whether a shard counts as passed.
- **`tests/unit/scripts/e2e/shard-verdict.spec.ts`** – Unit tests exercising `judgeShard` and `countFinishedSpecs` against various `ShardOutcome` shapes and synthetic Cypress output.
- **`tests/unit/scripts/e2e/shard-process.spec.ts`** – Tests the process-spawning side; indirectly validates that the `ShardOutcome` contract this file consumes is produced correctly.

## Notes

- `judgeShard` checks in a deliberate priority order (hung > signal > exit code > spec count). The first matching condition wins, so the `reason` string always names the *most specific* cause.
- `countFinishedSpecs` intentionally uses only text after the **last** `(Run Finished)` occurrence so earlier (partial) summary tables in the output are ignored.
- Rows are **not** de-duplicated by spec name: long names are truncated in the table, so two distinct specs can produce identical-looking rows. A wrapped second line (no status mark) will not match `SUMMARY_ROW`.
- `code` is `null` (not `undefined`) when a signal terminated the process; the `hung` flag is a separate concern from `signal !== null`.
