---
source: src/modules/inventory/tests/preorder-rows.spec.ts
sha256: 9df7c1298f3affc5b6eedb166fb408bedb6183758ce4f8b332527f26d0c22389
generated_at: 2026-10-17T01:00:59.516869+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/preorder-rows.spec.ts

## Purpose

Vitest spec for `preorderRows`, the board function that joins preorder allowance (level) and sales (summary) reads into one row per product. It pins the join semantics (missing half left absent, never zero-filled), title-precedence rule, and the "worst first" sort order.

## Key elements

- **`describe('preorderRows')`** — single suite containing five `it` blocks:
  - *both reads present* → row contains `level` and `summary`.
  - *allowance only* → `summary` is `undefined`, `level.productId` preserved.
  - *summary only* → `level` and `releaseDate` are `undefined`; title falls back to the summary's "frozen" name.
  - *title conflict* → live allowance title wins over the summary title.
  - *sort order* → late descending → preordered (outstanding) descending → title ascending.
- **`aPreorderLevel`, `aPreorderSummary`** — fixture factories used to build minimal inputs without duplicating shape.

## Relationships

- **`src/modules/inventory/domain/index.ts`** — the barrel from which this spec imports `preorderRows` (`import { preorderRows } from '../domain'`).
- **`src/modules/inventory/domain/preorder-rows.ts`** — the implementation under test; the barrel re-exports `preorderRows` from here.
- **`tests/support/unit/fixtures.ts`** — source of `aPreorderLevel` and `aPreorderSummary`; imported with an explicit `.ts` extension.

## Notes

- The fixtures import uses a relative path with an explicit `.ts` extension (`'../../../../tests/support/unit/fixtures.ts'`), unlike the extensionless `'../domain'` import. This is a convention in this repo for fixture/support imports.
- "Worst first" is a composite sort: `late` desc → `preordered` desc → `title` asc. Products with no late value are treated as 0 for that tier.
- Missing data is asserted as `undefined`, not `null` or `0` — the contract is *absent*, not *zero*.
