---
source: scripts/e2e/live-shard.ts
sha256: f24ed068099986881a6ad4fd193333311346ecd5aa3a63d87d35119ec56f0fe7
generated_at: 2026-10-02T11:34:41.739754+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/live-shard.ts

## Purpose

Computes which spec files a single CI matrix job (shard) runs in the nightly live test suite. Because live tests cannot share a database across shards, each job needs a disjoint, balanced slice of specs; this file only decides the slices. It reuses the same balancing logic as the demo shards so all jobs finish at roughly the same time.

## Key elements

- **`liveShardFiles(files, durations, index, total)`** — the sole export. Given the full spec list, per-spec durations, a 1-based shard index, and the total shard count, returns the sorted spec paths assigned to that shard. Throws `RangeError` on invalid index/total. Delegates weighing to `weighSpecs` and partitioning to `balanceShards`; if no durations are known it falls back to uniform (all-1) weights.

## Relationships

- **`scripts/e2e/shard-balancer.ts`** — provides `weighSpecs` and `balanceShards`, the two primitives `liveShardFiles` composes.
- **`scripts/e2e/print-live-shard.ts`** — a script that calls `liveShardFiles` to print shard assignments for inspection.
- **`tests/unit/scripts/e2e/live-shard.spec.ts`** — unit tests covering `liveShardFiles` (valid slices, edge cases, error paths).

## Notes

- `index` is **1-based**, not 0-based — pass `1` for the first shard.
- If `total` exceeds the number of specs, the function returns an empty array rather than throwing.
- Output is deterministic: identical inputs always yield the same partition, so every matrix job independently computes the identical full split.
- Uses `Array.prototype.toSorted` (non-mutating); requires Node ≥ 20.
