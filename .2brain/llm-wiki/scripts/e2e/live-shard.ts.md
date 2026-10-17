---
source: scripts/e2e/live-shard.ts
sha256: 92e4112b4639317e7fd526e7706ff928ad71a12897c48bc32ff8926196dd3f02
generated_at: 2026-10-17T00:00:23.937642+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/live-shard.ts

## Purpose

Computes the spec-to-matrix-job assignment for the nightly "live" E2E run. Because live shards cannot share a database, each CI matrix job gets its own services and runs its slice sequentially; this file only decides which specs land in which slice. It reuses the same balancing logic as the demo shards so slices finish at roughly the same time.

## Key elements

- **`liveShardSlices(files, durations, total)`** — Returns every slice as an array of sorted spec-path arrays. Deterministic for a given input, so all matrix jobs computing independently arrive at the same partition. Trailing slices are empty when `total` exceeds the spec count. Throws `RangeError` if `total` is not a positive integer.
- **`liveShardFiles(files, durations, index, total)`** — Convenience wrapper: returns the single slice for a 1-based `index`. Delegates to `liveShardSlices` and picks `[index - 1]`. Throws `RangeError` on invalid `index`/`total`.
- **Duration fallback** — A spec absent from `durations` is weighed at the mean; if *no* spec has a known duration, every spec is assigned weight 1.

## Relationships

- **`scripts/e2e/shard-balancer.ts`** — Provides `weighSpecs` and `balanceShards`, the core weighting and partitioning primitives this file composes.
- **`scripts/e2e/print-live-shard.ts`** — Sibling script that calls into the exports here to print the resulting shard assignments (e.g., for CI logging or manual inspection).
- **`tests/unit/scripts/e2e/live-shard.spec.ts`** — Unit tests covering the slice computation, edge cases (empty durations, `total` > spec count, invalid indices).

## Notes

- Callers that need multiple slices should call `liveShardSlices` once and index into the result, rather than calling `liveShardFiles` per slice. This avoids a scenario where a durations file written between two calls produces inconsistent partitions.
- `index` is **1-based**, not 0-based.
- The function sorts spec paths with `.toSorted()` (non-mutating); the original `files` array is never reordered.
