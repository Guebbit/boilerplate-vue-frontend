---
source: tests/unit/scripts/e2e/live-shard.spec.ts
sha256: 2f06092c6485b31692e75d0998f0eef64674bf32fd4d30c289c8cf1c168a407f
generated_at: 2026-10-17T02:42:55.771818+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/live-shard.spec.ts

## Purpose

Unit tests for the live-shard splitting algorithm in `scripts/e2e/live-shard.ts`. Verifies that the nightly E2E suite can be partitioned into duration-balanced slices (heaviest specs spread across slices), that the partition is a total cover with no duplicates, that results are stable regardless of input order, and that invalid inputs are rejected.

## Key elements

- **`FILES`** — Five dummy spec filenames used as a fixed test corpus.
- **`DURATIONS`** — Measured durations (heaviest first) for those five files; also an empty object is tested as the no-data fallback.
- **`describe('liveShardFiles', …)`** — Covers:
  - Total partition: flattening all slices yields exactly the input set.
  - Load balancing: heaviest files land in different slices.
  - Order independence: reversed input produces the same slice.
  - No-duration fallback: still splits, just by count.
  - `RangeError` on slice index `0`, out-of-range, non-integer, or total `0`.
- **`describe('liveShardSlices', …)`** — Covers:
  - Equivalence: `liveShardSlices` output equals per-index `liveShardFiles` calls.
  - `RangeError` on slice count `0` or non-integer.

## Relationships

- **`scripts/e2e/live-shard.ts`** — The sole dependency; exports `liveShardFiles` and `liveShardSlices` which are the units under test. No other modules are touched.

## Notes

- Slice indices are **1-based** in this algorithm (valid range is `1 … total`); index `0` is explicitly rejected.
- The "order independence" test relies on the implementation internally sorting by duration before assigning, so the caller's array order is irrelevant.
- The no-duration test (`DURATIONS = {}`) confirms a pure round-robin-by-count fallback exists.
