---
source: src/modules/inventory/domain/preorder-rows.ts
sha256: 3d55db485b76b9a90692d286c1f13cc569767c21486e80067bace198a3db348a
generated_at: 2026-10-17T00:58:56.133768+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/domain/preorder-rows.ts

## Purpose

Builds the product rows for the preorder board's table by joining two separate reads—allowance levels (`inventory`) and per-product unit counts by delivery state (`delivery`)—into a single list where each product appears exactly once. Products that exist in only one read are still included; the missing half is left `undefined` rather than defaulted to zero.

## Key elements

- **`PreorderRow` (interface)** — One row on the board. `level?` and `summary?` are optional: absence means "no data in that read," not a zero value. `title` prefers the live allowance title, falling back to the frozen summary title.
- **`preorderRows(levels, summaries)` (const arrow function)** — Merges the two arrays into `PreorderRow[]` via a `Map` keyed on `productId`, then returns a new sorted array. Sort order: most `late` units first, then most `preordered` (outstanding) units first, then title alphabetically.

## Relationships

- **`PreorderProductsTable.vue`** — Consumes `preorderRows` and the `PreorderRow` type to render the board's product table.
- **`domain/index.ts`** — Barrel file that re-exports this module so callers can import from the domain entry point.
- **`preorder-rows.spec.ts`** — Unit tests covering the join and sort behavior of `preorderRows`.

## Notes

- `toSorted` is used (non-mutating); the input arrays are never modified.
- "Absent" is semantically distinct from "zero": a product with no allowance row still appears (from summary alone) with `level` and `releaseDate` left `undefined`. Downstream renderers must treat `undefined` as "not applicable," not as `0`.
- The join is order-insensitive: whichever read lists a product first doesn't matter, but `title` resolution does prefer the level's (live) name over the summary's (frozen) name.
