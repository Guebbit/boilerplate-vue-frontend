---
source: src/modules/inventory/domain/preorder-rows.ts
sha256: deade12309a4b0834aacddd069ac3e100e7ed150702e348f4717cb3881fee482
signature: 784347829e1461ad896aaa5a74fd0ddde6a7b7190f72e852872d709edef47c97
generated_at: 2026-11-10T04:31:46.711248+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/domain/preorder-rows.ts

## Purpose

Builds the row data for the preorder board's product table by performing a full outer join of two domain reads — the allowance (`PreorderLevel`) and the per-product unit-by-state counts (`PreorderProductSummary`) — keyed on product. The union guarantees that a product appearing in only one read is still represented, with the missing half left as `undefined` rather than a fabricated zero.

## Key elements

- **`PreorderRow`** (interface) — One table row. `level` and `summary` are both optional to reflect the join semantics; `title` falls back to whichever read is present; `releaseDate` is present only when an allowance row exists.
- **`preorderRows`** (const, exported) — Accepts `readonly PreorderLevel[]` and `readonly PreorderProductSummary[]`, merges them into a `Map<productId, PreorderRow>`, then returns an array sorted by: late units descending → backordered units descending → title ascending (`localeCompare`).

## Relationships

- **`src/modules/inventory/domain/index.ts`** — Barrel file that re-exports `PreorderRow` and `preorderRows` so consumers can import from the domain entry point rather than this path directly.
- **`src/modules/inventory/components/PreorderProductsTable.vue`** — Consumes `preorderRows` (via the domain barrel) to render the joined, sorted table rows.
- **`src/modules/inventory/tests/preorder-rows.spec.ts`** — Unit tests covering the join logic, missing-half handling, and sort order.

## Notes

- Missing halves are **`undefined`**, never `0` or an empty object. Consumers must check for presence before reading `level.*` or `summary.*` fields.
- Sorting uses `toSorted` (non-mutating); the input arrays are not modified.
- `title` resolution: the allowance's title wins when both reads exist for the same product, because the summary pass only fills `title` when no row was previously set.
- The sort tie-break chain treats absent `summary.late` and `level.backordered` as `0` via `?? 0`, so a product with no sales sorts after one with sales, and a product with no allowance sorts after one with backorders.
