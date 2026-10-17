---
source: tests/unit/scripts/e2e/shard-balancer.spec.ts
sha256: eb45490cf7703ad1fb21b1322c30cc028e919ede5535ebc0bb5a363b8274203e
generated_at: 2026-10-17T02:43:35.134283+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/shard-balancer.spec.ts

## Purpose

Unit tests for the LPT (Longest-Processing-Time) shard-balancing algorithm in `scripts/e2e/shard-balancer.ts`. The tests use small, hand-built duration tables instead of the real `SECONDS` values so that the algorithmic properties (sorting, packing, edge cases) remain legible and deterministic.

## Key elements

- **`spec(file, key?)`** — local helper that constructs a `Spec` object (key defaults to the file name).
- **`describe('weighSpecs')`** — verifies that `weighSpecs` assigns a known spec its measured duration, falls back to the mean of known durations for unknown specs, and returns results sorted heaviest-first.
- **`describe('balanceShards')`** — verifies the LPT packing behavior: a dominant spec gets its own shard; near-equal specs split evenly; extra shards beyond spec count are returned empty (not an error); zero shards + zero specs yields `[]`.
- **`describe('SECONDS — the real timing table')`** — sanity guards: the real `SECONDS` map has >15 entries and all values are positive, preventing the other tests from passing vacuously against a degenerate table.

## Relationships

- **`scripts/e2e/shard-balancer.ts`** — the module under test. This file imports `SECONDS`, `weighSpecs`, `balanceShards`, and the `Spec` type from it. All test assertions exercise that module's exports directly.

## Notes

- The file deliberately avoids using `SECONDS` values inside the algorithm tests; the only place the real table is referenced is the guard block at the bottom.
- The `balanceShards` "more shards than specs" test asserts that surplus shards are *returned* as empty objects (`{ files: [], load: 0 }`) rather than omitted — callers can rely on the array length matching the requested shard count.
- The header comment positions this as the only script in `scripts/` with enough algorithmic substance to warrant isolated unit testing.
