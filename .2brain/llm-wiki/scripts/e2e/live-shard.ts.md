---
source: scripts/e2e/live-shard.ts
sha256: 8adce9c1999773b81d6c2749ee74d9b7d4e480524838741e328a873112625608
signature: f25efdd05b5547719698142b1329c82d954c5946c701f962ba88fbf0a6b71215
generated_at: 2026-11-10T02:33:36.787561+00:00
model: ollama:qwen3.8:27b
---

# scripts/e2e/live-shard.ts

## Purpose

Computes how to split the nightly live E2E suite into CI matrix slices. Because live tests cannot share a database between shards, each matrix job runs its own services sequentially; this module only decides which spec paths land in which slice. It reuses the same duration-based balancing algorithm as the demo shards so all slices finish at roughly the same time.

## Key elements

- **`liveShardSlices(files, durations, total)`** — Returns one sorted spec-path array per slice. Deterministic for a given input; a single call yields all slices so that a growing `durations` file cannot cause two calls to disagree. Trailing slices are empty when `total` exceeds the spec count. Throws `RangeError` if `total` is not a positive integer.
- **`liveShardFiles(files, durations, index, total)`** — Convenience wrapper that returns only slice `index` (1-based) from a single `liveShardSlices` call. Throws `RangeError` for out-of-range or non-integer arguments.
- **`SliceRequest`** (type) — Discriminated union: `{ kind: 'antibot' }` or `{ kind: 'slice'; index; total }`.
- **`parseSliceRequest(value)`** — Parses the `E2E_SLICE` env-var value a CI matrix job passes. Accepts `"antibot"`, `"<index>/<total>"`, or `undefined`/blank (returns `undefined`, meaning "run all slices locally"). Throws `RangeError` for malformed values.

## Relationships

- **`scripts/e2e/shard-balancer.ts`** — Provides `weighSpecs` and `balanceShards`, the core balancing algorithm this file delegates to.
- **`scripts/e2e/run-shards.ts`** — The sharded runner that calls `parseSliceRequest` (to read `E2E_SLICE`) and `liveShardFiles` (to get its spec list) before executing.
- **`scripts/e2e/print-live-shard.ts`** — Calls `liveShardSlices` to print the full partition for inspection/debugging.
- **`tests/unit/scripts/e2e/live-shard.spec.ts`** — Unit tests covering validation, balancing, and `parseSliceRequest` edge cases.
- **`tests/cross-cutting/module-map.spec.ts`** — Verifies this file's exports and import surface as part of the project-wide module map.

## Notes

- Specs missing from the `durations` record are weighed at the mean of known durations; if *no* spec has a known duration, every spec gets weight 1.
- `liveShardFiles` always re-derives the full partition from a single `liveShardSlices` call, so it is safe even when called by independent matrix jobs that may have slightly different `durations` files.
- The `antibot` slice kind is a special non-spec run (presumably a bot-protection check); it is not a numeric slice and is not subject to balancing.
