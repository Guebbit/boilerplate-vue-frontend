---
source: tests/unit/scripts/e2e/shard-balancer.spec.ts
sha256: eb45490cf7703ad1fb21b1322c30cc028e919ede5535ebc0bb5a363b8274203e
signature: 7b397e0c07e65f6aba0902fe78d94fa16e6468e6b1e3f2cbcda5c95605f3c0a4
generated_at: 2026-11-10T08:17:39.043237+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/shard-balancer.spec.ts

## Purpose

Unit tests for the LPT (Longest-Processing-Time) shard-balancing algorithm in `scripts/e2e/shard-balancer.ts`. The file verifies that `weighSpecs` assigns correct weights and ordering, that `balanceShards` distributes specs across shards as expected, and that the real `SECONDS` timing table is non-degenerate. It exists because the balancer is the only algorithmic logic in the otherwise process-orchestration `scripts/` directory.

## Key elements

- **`spec(file, key?)`** — local helper that builds a `Spec` object; `key` defaults to `file`.
- **`describe('weighSpecs')`** — three cases: known key resolves to its measured duration; unknown key falls back to the mean of known durations; output is sorted heaviest-first.
- **`describe('balanceShards')`** — four cases: a single spec heavier than the rest gets its own shard; near-equal specs split evenly; more shards than specs yields empty shards (no error); zero shards + zero specs returns `[]`.
- **`describe('SECONDS — the real timing table')`** — two sanity guards: the table has more than 15 entries and all values are positive, preventing the algorithmic tests above from passing vacuously.

## Relationships

- **`scripts/e2e/shard-balancer.ts`** — the sole import target. Provides `SECONDS` (the real duration table), `weighSpecs`, `balanceShards`, and the `Spec` type. This spec file is the only unit test for that module.

## Notes

- Algorithmic tests use small hand-built weight arrays (e.g. `[{ weight: 50 }, { weight: 10 }, { weight: 10 }]`) rather than the real `SECONDS` values, so expected shard assignments remain readable and deterministic.
- The `SECONDS` describe block is intentionally minimal — it only checks cardinality and positivity, not specific durations. Its purpose is to catch a table that was accidentally emptied or corrupted, which would make every `weighSpecs`/`balanceShards` test pass for the wrong reason.
- The file imports from `../../../../scripts/e2e/shard-balancer` (four directory levels up), reflecting the `tests/unit/scripts/e2e/` nesting convention.
