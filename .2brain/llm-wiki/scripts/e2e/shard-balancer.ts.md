---
source: scripts/e2e/shard-balancer.ts
sha256: 6448875735a3eb578c0259cb2ea92760a1c9af51c9217adb040071dca855c4d7
generated_at: 2026-10-02T11:36:59.784406+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/shard-balancer.ts

## Purpose

Pure LPT (longest-processing-time) bin-packing logic extracted from `run-e2e-shards.ts` so the scheduling algorithm can be unit-tested in isolation. Contains no I/O or process orchestration—just the duration table, weight resolution, and shard assignment.

## Key elements

- **`Spec`** – interface for a single spec file (`file` path + `key`).
- **`WeightedSpec`** – a spec with its numeric `weight` resolved; expected sorted descending by weight.
- **`Shard`** – one shard's assignment: the list of `files` and their summed `load`.
- **`SECONDS`** – static `Record<string, number>` mapping spec keys to measured seconds (from the 2026-08-14 run). Missing keys fall back to the mean.
- **`weighSpecs(specs, durations)`** – maps each spec to a `WeightedSpec`, substituting the mean of known durations for any unknown key, then returns the array sorted heaviest-first.
- **`balanceShards(weighted, shardCount)`** – LPT greedy: iterates specs heaviest-first, placing each on the currently least-loaded shard. Returns one `Shard` per index; extra shards beyond the spec count are simply empty.

## Relationships

- **`scripts/e2e/run-shards.ts`** – the original home of this logic; the comments reference it as `run-e2e-shards.ts`. It builds the `Spec[]` from a glob and is expected to call `weighSpecs` + `balanceShards` before spawning workers.
- **`tests/unit/scripts/e2e/shard-balancer.spec.ts`** – the dedicated unit test exercising `weighSpecs` and `balanceShards` directly, which is the reason this module was separated from the orchestration script.
- **`scripts/e2e/live-shard.ts` / `print-live-shard.ts`** – sibling E2E helper scripts in the same directory; they consume shard assignments produced upstream but do not import this module directly.

## Notes

- `SECONDS` values are intentionally coarse ("only need to be roughly right, since LPT is tolerant of error"). Refresh them from a run's summary table when balance drifts.
- Unknown spec keys are scheduled at the **mean** of known durations—not 0, not skipped—so a newly added file neither hogs a shard nor is treated as free.
- `weighSpecs` uses `.toSorted()` (non-mutating), so the input array is unchanged.
- `balanceShards` does not error if `shardCount > weighted.length`; surplus shards come back empty.
