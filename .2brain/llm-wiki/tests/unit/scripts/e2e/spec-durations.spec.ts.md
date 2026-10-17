---
source: tests/unit/scripts/e2e/spec-durations.spec.ts
sha256: ab9aeec1c26b88cfbb2b8dc2f48fdbb5a84594a048ed844ce66053ded1d00aef
generated_at: 2026-10-17T02:43:44.288186+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/spec-durations.spec.ts

## Purpose

Unit tests for the per-file E2E spec duration tracking used by the shard balancer. Verifies that `readSpecDurations` and `recordSpecDuration` correctly persist and retrieve durations keyed by full spec path, handle duplicate basenames, keep the latest value on re-runs, and degrade gracefully on corrupt JSONL lines — all against a throwaway temp directory so the real `reports/` tree is never touched.

## Key elements

- **`scratch`** — module-level array of temp directories created during a test; cleared in `afterEach`.
- **`reportFile()`** — creates a fresh `mkdtemp` directory, records it in `scratch`, and returns a path ending in `nested/durations.jsonl` for that run.
- **`afterEach` hook** — recursively removes every directory tracked in `scratch`.
- **`describe('readSpecDurations')`** — four cases:
  - Empty object returned when the report file has never been written.
  - Two specs sharing the basename `a11y.cy.ts` in different module paths are stored as distinct keys.
  - Recording the same spec twice keeps only the most recent `seconds` value.
  - A trailing malformed JSONL line is skipped without throwing; valid lines above it are still read.

## Relationships

- **`scripts/e2e/spec-durations.ts`** — the module under test. This spec imports `readSpecDurations` and `recordSpecDuration` from it and exercises both directly.

## Notes

- The report format is JSONL (one JSON object per line); `recordSpecDuration` appends, and `readSpecDurations` replays lines in order, so the last entry for a given spec path wins.
- Tests deliberately target a `nested/` subdirectory under the temp root to confirm the implementation creates parent directories rather than assuming a flat layout.
- The corrupt-line test appends raw text (`{not json\n`) with `flag: 'a'` to simulate partial writes or manual edits in production.
