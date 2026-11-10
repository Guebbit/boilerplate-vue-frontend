---
source: scripts/e2e/shard-balancer.ts
sha256: a140604b65f8009c501225ab954ddbb1d8115ff826b9952377917e9687cec156
signature: ed8d973a16b54f71cb63fea2fa6c4c894d7429cd1cb037a9051959a15fc76abd
generated_at: 2026-11-10T02:35:56.031589+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/shard-balancer.ts

## Purpose

Pure (side-effect-free) balancing logic for distributing e2e spec files across parallel shards. Extracted from `run-shards.ts` so the LPT bin-packing algorithm can be unit-tested in isolation, following the same "pure core / orchestration shell" pattern used by `mutation-baseline.ts`.

## Key elements

- **`Spec`** — interface describing one spec file (`file` path + `key` used to look up its duration).
- **`WeightedSpec`** — `Spec` with a resolved numeric `weight`; expected to arrive sorted heaviest-first.
- **`Shard`** — one shard's assignment: list of `files` and their summed `load`.
- **`SECONDS`** — measured per-spec durations (seconds) from a 2026-08-14 run. Serves as the default `durations` map; values only need to be roughly accurate.
- **`weighSpecs(specs, durations)`** — maps each spec's key to a weight from `durations`, falling back to the mean of known durations for unknown keys. Returns the result sorted descending by weight.
- **`balanceShards(weighted, shardCount)`** — LPT bin-packing: iterates specs heaviest-first, each joining the currently lightest shard. Extra shards beyond the spec count simply remain empty.

## Relationships

- **`scripts/e2e/run-shards.ts`** — the orchestration shell that builds the `Spec[]` list from a glob, calls `weighSpecs` + `balanceShards`, and then spawns/shells out per shard. This file is the "pure half" it delegates to.
- **`scripts/e2e/live-shard.ts`** — the per-shard runner that actually executes the files assigned to one shard by `balanceShards`.
- **`scripts/e2e/print-live-shard.ts`** — formatting/printing companion for live shard output; consumes shard assignments produced upstream.
- **`tests/unit/scripts/e2e/shard-balancer.spec.ts`** — unit tests exercising `weighSpecs` and `balanceShards` in isolation (the reason this module was extracted).

## Notes

- `SECONDS` is intentionally a rough snapshot, not a live measurement. Refresh the values from a run's summary table when shard balance drifts; LPT tolerates moderate error.
- A spec key missing from `SECONDS` (or any passed `durations` map) is scheduled at the **mean** of known durations — neither 0 (free) nor a large default (hog).
- `weighSpecs` uses `toSorted` (non-mutating); callers should pass a fresh array or ignore the original.
- `balanceShards` is O(n·k) — a linear scan for the lightest shard per spec. Fine for the current spec count; not intended for thousands of shards.
