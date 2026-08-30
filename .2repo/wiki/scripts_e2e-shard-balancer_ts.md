# scripts/e2e-shard-balancer.ts

## Purpose

Pure balancing logic extracted from `run-e2e-shards.ts`. It holds the measured-duration table and the LPT (longest-processing-time) bin-packing algorithm that assigns E2E spec files to shards, isolated so the algorithmic core can be unit-tested independently of the process-orchestration code.

## Key elements

- **`Spec`** (interface) — a spec file as built by the caller: `{ file, key }`.
- **`WeightedSpec`** (interface) — a spec with a resolved numeric `weight`, sorted descending.
- **`Shard`** (interface) — one shard's assignment: list of `files` and their summed `load`.
- **`SECONDS`** (const) — hardcoded seconds-per-spec measured from the 2026-08-14 run. Used as the `durations` argument to `weighSpecs` in production.
- **`weighSpecs(specs, durations)`** — resolves each spec's weight from `durations`, falling back to the mean of known durations for missing keys; returns specs sorted heaviest-first.
- **`balanceShards(weighted, shardCount)`** — LPT greedy: iterates weighted specs heaviest-first, placing each into the currently lightest shard. Returns one `Shard` per shard in order. Extra shard slots beyond the spec count are left empty.

## Relationships

- **`scripts/run-e2e-shards.ts`** — the caller. Imports `weighSpecs`, `balanceShards`, `SECONDS`, and the type interfaces to split the globbed spec list across CI shards. This file is the "pure half"; that file is the orchestration half.
- **`tests/unit/scripts/e2e-shard-balancer.spec.ts`** — unit-tests `weighSpecs` and `balanceShards` in isolation (the reason this logic was extracted).

## Notes

- `SECONDS` values are intentionally approximate; refresh them from a run's summary table only when balance drifts. LPT tolerates small errors.
- A spec key missing from the durations map is weighted at the **mean** of all known durations, not 0 or Infinity, so a newly added file neither hogs a shard nor is treated as free.
- `balanceShards` performs a linear scan for the lightest shard each iteration (O(n·s)). This is fine at the current spec count; it is not heap-optimized.
- The file mirrors the same "pure-logic-extracted-from-orchestrator" pattern as `mutation-baseline.ts`.
