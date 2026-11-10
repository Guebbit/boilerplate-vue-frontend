---
source: scripts/e2e/spec-durations.ts
sha256: c944e7ff5282607c3f5218d203120a9c509ca3148c30f537aa4062fe2f32a6da
signature: cea26f3cbdff7a81f090fe3571305b5fb57c4e1a1a9dd3216af1d32a74d20d6f
generated_at: 2026-11-10T02:36:48.840037+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/spec-durations.ts

## Purpose

Provides a self-improving store of per-spec measured wall-clock durations (JSONL) for the e2e shard balancer. Because `run-shards.ts` now keys weights by the spec's full relative path rather than basename, this file holds the real per-path numbers. Durations are recorded automatically on every Cypress run and accumulate over time, replacing the old frozen hand-measured `SECONDS` table.

## Key elements

- **`SPEC_DURATIONS_FILE`** – Resolved path to `reports/e2e/durations.jsonl` (gitignored). Single source of truth for where all Cypress processes append.
- **`SpecDuration`** – Interface: `{ spec: string; seconds: number }`. `spec` is the relative path Cypress reports in `after:spec`.
- **`recordSpecDuration(entry, file?)`** – Ensures the directory exists, then appends one JSON line via `appendFileSync`. Safe under concurrent shard writes.
- **`readSpecDurations(file?)`** – Parses every line; later entries for the same `spec` override earlier ones (most-recent-wins). Unparseable lines are silently skipped. Returns `Record<string, number>` ready for the balancer.

## Relationships

- **`cypress.config.ts`** – Its `after:spec` hook calls `recordSpecDuration` after every spec run, writing the measured duration into the JSONL file.
- **`scripts/e2e/run-shards.ts`** – Consumes the output of `readSpecDurations` to look up per-path weights for its shard-balancing logic (replacing the old basename-keyed table).
- **`scripts/e2e/print-live-shard.ts`** – Reads from the same shard-balancer infrastructure; `readSpecDurations` output feeds the weight calculations it displays.
- **`tests/unit/scripts/e2e/spec-durations.spec.ts`** – Unit-tests `recordSpecDuration` and `readSpecDurations` against a temporary file to verify append, multi-entry overwrite, and malformed-line tolerance.

## Notes

- **JSONL + `appendFileSync` is intentional.** Multiple shards write to the same file concurrently; a single `appendFileSync` call is the one write atomic enough to avoid interleaving a half-line (same pattern as `flaky-report.ts`).
- **Most-recent-wins on read.** The file is append-only and never truncated; `readSpecDurations` simply lets later `spec` entries overwrite earlier ones in the returned map.
- **Malformed lines are skipped, not thrown.** A stale or truncated line about shard timing must not fail a run.
- **Path, not basename.** The key is the spec's full relative path (e.g. `modules/auth/a11y.cy.ts`), distinguishing the 15 same-named `a11y.cy.ts` files that previously shared one weight.
