---
source: scripts/e2e/spec-durations.ts
sha256: ebacbc5e02312f79ac674a0e0526613b2094abd71cd4c21fce141d3eec7eaae1
generated_at: 2026-10-02T11:37:20.707849+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/spec-durations.ts

## Purpose

Stores and retrieves per-spec-file wall-clock durations so the e2e shard balancer can weight specs by their full relative path rather than basename. This fixes FA126, where all 15 `a11y.cy.ts` files shared a single static weight. Durations accumulate across runs via `cypress.config.ts`'s `after:spec` hook, so the balancer's numbers self-improve instead of staying frozen.

## Key elements

- **`SPEC_DURATIONS_FILE`** — Resolved path to `reports/e2e/durations.jsonl` (gitignored). The single shared append target for all Cypress processes.
- **`SpecDuration`** (interface) — `{ spec: string; seconds: number }`; one spec's measured time for a single run.
- **`recordSpecDuration(entry, file?)`** — Creates the directory if needed, then appends one JSON line to the report.
- **`readSpecDurations(file?)`** — Parses the JSONL file and returns `Record<string, number>` mapping spec path → most-recent seconds. Malformed lines are silently skipped.

## Relationships

- **`cypress.config.ts`** — Its `after:spec` hook calls `recordSpecDuration` after every spec run, feeding real durations into the file.
- **`scripts/e2e/run-shards.ts`** — Calls `readSpecDurations` and uses the returned map to key weight lookups by the spec's full relative path (replacing the old basename-keyed `SECONDS` table).
- **`tests/unit/scripts/e2e/spec-durations.spec.ts`** — Unit-tests `recordSpecDuration` and `readSpecDurations`, passing a temporary file path via the optional `file` parameter.

## Notes

- **Concurrent-write safety:** Multiple shard processes append to the same file simultaneously. A single `appendFileSync` call is the one operation that cannot interleave another shard's half-line, so the format is JSONL (one object per line) rather than a pretty-printed array.
- **Last-write-wins:** When the same spec appears multiple times, `readSpecDurations` keeps the most recent value (later lines overwrite earlier ones in the loop).
- **Lenient parsing:** A truncated or malformed line is skipped with a `catch` block rather than throwing, so one bad line can't fail an entire shard run.
- **The `file` parameter** on both exported functions exists so tests can redirect I/O away from the real `reports/` directory.
