---
source: src/modules/products/domain/shelf-state.ts
sha256: a1abcdbe85b99161271bd19ea2dbba342f9ed232930958034d65256bea3d88f6
generated_at: 2026-10-17T01:28:11.870151+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/domain/shelf-state.ts

## Purpose

Pure domain helper that reduces a product's three shelf flags (`purchasable`, `preorder`, `inStock`) into a single `ShelfState` value. It exists so every UI surface (card, product page, add-to-cart button) derives the same label from the same priority rule without duplicating the logic.

## Key elements

- **`ShelfState`** (type) — Union of four literals: `'off-sale' | 'preorder' | 'out-of-stock' | 'in-stock'`.
- **`shelfStateOf`** (const) — Takes `Pick<Product, 'purchasable' | 'preorder' | 'inStock'>` and returns a `ShelfState`. Priority is fixed:
  1. `purchasable === false` → `'off-sale'`
  2. `preorder === true` → `'preorder'`
  3. `inStock` truthy → `'in-stock'`, otherwise `'out-of-stock'`

## Relationships

- **`src/modules/products/domain/index.ts`** — Barrel file that re-exports `ShelfState` and `shelfStateOf` so consumers import from the domain barrel rather than this path directly.
- **`src/modules/products/components/ProductCard.vue`** and **`src/modules/products/views/Product.vue`** — Both call `shelfStateOf` to render the shelf badge; they are the primary consumers this module was created to keep in agreement.
- **`src/modules/products/tests/shelf-state.spec.ts`** — Unit tests covering the priority ordering and the "absent `purchasable` reads as on sale" edge case.

## Notes

- `shelfStateOf` never reads a stock *count*; it relies solely on the three boolean flags the server attaches to every `Product` reader.
- The `purchasable === false` check is strict: `undefined` or `null` falls through to the preorder/stock branches (i.e., "absent reads as on sale").
- The module is intentionally side-effect-free and dependency-light (one type import from `@types`) so it can be imported anywhere in the product surface without pulling in UI code.
