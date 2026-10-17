---
source: scripts/e2e/spec-durations.ts
sha256: c944e7ff5282607c3f5218d203120a9c509ca3148c30f537aa4062fe2f32a6da
generated_at: 2026-10-17T00:01:28.577016+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/spec-durations.ts

## Purpose

Persists per-spec wall-clock durations (keyed by full relative path) so the e2e shard balancer weighs each spec by its actual cost rather than a single shared basename entry. Durations accumulate across runs via `cypress.config.ts`'s `after:spec` hook, keeping the balancer's numbers fresh without manual re-measurement.

## Key elements

- **`SPEC_DURATIONS_FILE`** — Resolved path to `reports/e2e/durations.jsonl` (gitignored). The single append target for all shards.
- **`SpecDuration`** — Interface: `{ spec: string; seconds: number }`. The spec is the full repo-relative path as Cypress reports it in `after:spec`.
- **`recordSpecDuration(entry, file?)`** — Appends one JSON line to the durations file. Creates parent dirs if needed. The `file` parameter defaults to `SPEC_DURATIONS_FILE` but lets tests redirect to a temp path.
- **`readSpecDurations(file?)`** — Reads the whole JSONL file and returns `Record<string, number>` (spec path → seconds). Later lines for the same spec overwrite earlier ones (most recent measurement wins). Unparseable lines are silently skipped.

## Relationships

- **`cypress.config.ts`** — Its `after:spec` hook calls `recordSpecDuration` with `results.stats.duration` after every spec run, feeding new measurements into the JSONL file.
- **`scripts/e2e/run-shards.ts`** — Calls `readSpecDurations` to build its weight table, keying lookups by the spec's full relative path (the fix for 15 same-basename specs sharing one weight).
- **`tests/unit/scripts/e2e/spec-durations.spec.ts`** — Unit-tests both `recordSpecDuration` and `readSpecDurations`, using the `file` parameter to write to a temp file instead of the real report.

## Notes

- **Concurrency-safe by design:** The file is JSONL (one JSON object per line) and the only mutation is a single `appendFileSync` call, the one write operation that cannot interleave a partial line from another shard process. This mirrors the same pattern used in `flaky-report.ts`.
- **Reads are lenient:** `readSpecDurations` skips lines that fail `JSON.parse` rather than throwing, so a truncated or stale line never fails a shard run.
- **The `file` parameter exists for testability.** Both exported functions accept an optional path; the real runtime always uses the `SPEC_DURATIONS_FILE` default.
