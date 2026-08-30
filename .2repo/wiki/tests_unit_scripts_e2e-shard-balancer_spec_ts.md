# tests/unit/scripts/e2e-shard-balancer.spec.ts

## Purpose
Unit tests for the LPT (Longest Processing Time) shard-balancing algorithm in `scripts/e2e-shard-balancer.ts`. It verifies spec weighting, greedy shard packing, and the shape of the real `SECONDS` timing table, using small hand-built duration tables so the algorithmic properties are legible independent of actual measured runtimes.

## Key elements
- **`spec(file, key?)`** — local factory that produces a minimal `Spec` object for test fixtures.
- **`describe('weighSpecs')`** — verifies that `weighSpecs` assigns measured durations, falls back to the mean of known durations for unmeasured specs, and returns results sorted heaviest-first.
- **`describe('balanceShards')`** — verifies LPT packing behavior: a dominant spec lands alone, near-equal specs split evenly, extra shards stay empty (no error), and zero-shard/zero-spec input yields `[]`.
- **`describe('SECONDS')`** — "guard on the guard": asserts the real timing table has > 15 entries and all values are positive, preventing every algorithmic test from passing vacuously against a degenerate table.

## Relationships
- **`scripts/e2e-shard-balancer.ts`** — the sole SUT. This spec imports `SECONDS`, `weighSpecs`, `balanceShards`, and the `Spec` type from it. It is the only test that exercises the balancer's algorithmic logic; other `scripts/` files (process orchestration) are not tested here.

## Notes
- Tests are deliberately driven against small literal weight arrays (e.g. `{ a: 40, b: 20 }`) rather than the real `SECONDS`, keeping expected outputs stable and readable.
- The `SECONDS` sanity block is not testing the algorithm; it is a meta-assertion that the timing table is non-empty and well-formed so the other tests are not vacuously green.
- `balanceShards` is expected to return shards in a deterministic order (heaviest shard first), which the tests rely on via exact `toEqual` comparisons.
