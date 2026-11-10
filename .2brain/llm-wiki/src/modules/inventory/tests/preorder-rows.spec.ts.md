---
source: src/modules/inventory/tests/preorder-rows.spec.ts
sha256: bcef63a61b4f6b5f73d7244ac9cbd1b74ae69846c87110528a0d4874c1c49004
signature: bcef63a61b4f6b5f73d7244ac9cbd1b74ae69846c87110528a0d4874c1c49004
generated_at: 2026-11-10T04:35:01.362248+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/preorder-rows.spec.ts

## Purpose
Vitest spec for the `preorderRows` domain function. Verifies that the join of preorder levels (allowances) and preorder summaries (units by state) produces one row per product, leaves a missing half absent (never zero), names the product by the live allowance title when available, and orders rows worst-first (most late → most outstanding → alphabetical).

## Key elements
- **`describe('preorderRows')`** — single top-level suite with five `it` cases:
  - Joins a product present in both reads into one row carrying `level` and `summary`.
  - Keeps a product that has only an allowance; asserts `row?.summary` is absent via `toBeUndefined()`.
  - Keeps a product that has only a summary; asserts `row?.level` and `row?.releaseDate` are absent via `toBeUndefined()`, and the title falls back to the summary's.
  - Confirms the live allowance title wins over the summary title when both are present.
  - Verifies the composite sort: most `late` first, then most `backordered`, then title alphabetically.
- **`aPreorderLevel`, `aPreorderSummary`** — fixture factories used to build minimal, single-product inputs.

## Relationships
- **`src/modules/inventory/domain/preorder-rows.ts`** — implements `preorderRows`, the unit under test.
- **`src/modules/inventory/domain/index.ts`** — barrel re-export; the spec imports `preorderRows` through this (`../domain`), exercising the public surface.
- **`tests/support/unit/fixtures.ts`** — provides the `aPreorderLevel` and `aPreorderSummary` factories that all five tests use to construct their inputs.

## Notes
- The spec file is marked `@module` (no named exports); it has no runtime side-effects beyond running the tests.
- Imports from the fixture file use an explicit `.ts` extension and a four-level relative path (`../../../../tests/…`), i.e. it reaches outside the module's own directory tree.
- "Worst first" ordering is a single composite key, not a stable secondary sort on product ID; ties on late *and* backordered break by title alphabetically.
