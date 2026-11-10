---
source: tests/unit/scripts/audit/plan-batches.spec.ts
sha256: 42fd6687d0cccfdbe2a5e8b8dce6acc3c5eca5ec3cb7f11e3b9b2d4fd04c9f8b
signature: e81689ccb3e36bedf12008fd83219ccc36826d2cb51a98188fcfd0b35383fb16
generated_at: 2026-11-10T08:12:41.509060+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/audit/plan-batches.spec.ts

## Purpose

Unit tests for `planBatches`, which partitions a captured `DesignShot` manifest into reviewable batches constrained by image-token and tile budgets. The spec verifies grouping, budget-splitting, and edge-case behavior so the batching logic can be refactored safely.

## Key elements

- **`shotOf(module, caseName, id, tiles?, tokens?)`** — local fixture factory that returns a fully-populated `DesignShot` object (one tile by default, 1000 tokens per tile) with realistic page/viewport metadata, so tests can vary only the fields under test.
- **`budget`** — default budget constant (`imageTokens: 3000, tiles: 20`) shared across most cases.
- **`describe('planBatches')`** — six test cases covering:
  - Grouping shots by `module` (order preserved, different modules land in separate batches).
  - Splitting into `orders-1`, `orders-2`, … when adding the next case would exceed the **token** budget.
  - Splitting when the **tile** budget would be exceeded.
  - Never splitting shots that share the same `module` + `caseName` (different viewports), even if the case alone exceeds budget.
  - Correct aggregation of `tileCount` and `estimatedTokens` on the returned batch object.
  - Empty manifest returns `{ batches: [], problem: /nothing was captured/ }`.

## Relationships

- **`scripts/audit/design-manual/scripts/plan-batches.ts`** — the module under test; provides `planBatches` (the only function exercised here).
- **`scripts/audit/design-manual/scripts/manifest.ts`** — supplies the `DesignShot` type used by both the fixture helper and the function's input shape.

## Notes

- The helper `shotOf` hard-codes `viewport: 'phone'`; the "never splits one case" test overrides it to `'desktop'` via a spread, so the two shots share `module`/`caseName` but differ in viewport.
- Batch names follow the pattern `<module>` when a module fits in one batch, or `<module>-<n>` (1-indexed) when split across multiple.
- The `problem` field is only asserted for the empty-manifest case; no test confirms it is `undefined` on the happy path.
