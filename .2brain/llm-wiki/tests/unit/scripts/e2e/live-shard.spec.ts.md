---
source: tests/unit/scripts/e2e/live-shard.spec.ts
sha256: b457b7085059ee3c9e1a3f7df0ccbeea125ad86a7971bf2d2040a4bb28d745a9
signature: 2c2b56290da15d3668844b0766bc2439dc506a87dad812bd2bbf50b6644323ea
generated_at: 2026-11-10T08:16:47.283377+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/e2e/live-shard.spec.ts

## Purpose

Unit tests for the live shard-splitting logic in `scripts/e2e/live-shard`. Verifies that the nightly "live split" partitions every spec file into exactly one slice, distributes the heaviest files across slices, and that the slice-request parser handles all valid and invalid inputs correctly.

## Key elements

- **`describe('liveShardFiles')`** — Tests the per-slice file assignment:
  - Partition completeness: the union of all slices equals the full file list, with no duplicates.
  - Load balancing: heaviest specs (`a.cy.ts`, `b.cy.ts`) land in different slices.
  - Input-order invariance: reversing the input array yields the same partition.
  - Fallback: with an empty durations map, files are still split (3/2 for 2 slices).
  - Range validation: out-of-range or non-integer indices throw `RangeError`.

- **`describe('liveShardSlices')`** — Tests the batch API:
  - Returns the same partition as calling `liveShardFiles` per-index.
  - Rejects non-positive or non-integer slice counts with `RangeError`.

- **`describe('parseSliceRequest')`** — Tests the string parser:
  - `undefined`/empty/whitespace → `undefined` (no slicing).
  - `'antibot'` → `{ kind: 'antibot' }`.
  - `' 3/5 '` (whitespace-tolerant) → `{ kind: 'slice', index: 3, total: 5 }`.
  - Invalid values (`'0/5'`, `'6/5'`, `'1/0'`, `'a/b'`, `'1/2/3'`, `'-1/5'`, case-mismatched `'Antibot'`) → `RangeError`.

## Relationships

- **`scripts/e2e/live-shard.ts`** — The sole module under test. This spec imports `liveShardFiles`, `liveShardSlices`, and `parseSliceRequest` and exercises their contracts (partition invariants, error boundaries, parse semantics).

## Notes

- Tests use `toSorted()` (ES2023 method) for order-independent array comparison; the project's TS target must support it.
- The "heaviest first" durations map (`a: 100` … `e: 5`) is intentionally fixed; the algorithm is expected to be deterministic given that input.
- `parseSliceRequest` is case-sensitive for the `'antibot'` keyword — `'Antibot'` is a valid rejection case, not a typo.
