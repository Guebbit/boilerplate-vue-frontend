---
source: src/modules/products/domain/shelf-state.ts
sha256: c31e9ba3c13d29ebd7557d699c7cfa08418e405d0976d2ded7b4d02eb1acd902
signature: 7e3a2bbbf4dc62645410a97cb01ac182e588459990b5644ad35737326538f989
generated_at: 2026-11-10T05:20:42.281067+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/domain/shelf-state.ts

## Purpose

Pure function that collapses a product's individual availability flags into a single `ShelfState` value, giving every UI surface (card, product page, add-to-cart button) one agreed-upon answer to "what is this product's shelf state right now?" without any of them re-implementing the priority logic.

## Key elements

- **`ShelfState`** (type) — Union of five string literals: `'off-sale' | 'preorder' | 'backorder' | 'out-of-stock' | 'in-stock'`. Represents every distinct state a shopper can be shown.
- **`shelfStateOf`** (function) — Takes a `Pick<Product, 'purchasable' | 'preorder' | 'backorder' | 'inStock'>` and returns a `ShelfState`. Priority order in code:
  1. `purchasable === false` → `'off-sale'`
  2. `!inStock` → `'backorder'` (if `backorder` flag is set) else `'out-of-stock'`
  3. `inStock` → `'preorder'` (if `preorder` flag is set) else `'in-stock'`

## Relationships

- **`src/modules/products/domain/index.ts`** — Barrel file that re-exports `ShelfState` and `shelfStateOf` so consumers can import from the domain entry point.
- **`src/modules/products/components/ProductCard.vue`** — Calls `shelfStateOf` to render the shelf badge on the product card.
- **`src/modules/products/views/ProductTarget.vue`** — Calls `shelfStateOf` on the product detail / add-to-cart surface.
- **`src/modules/products/tests/shelf-state.spec.ts`** — Unit tests covering the priority branches of `shelfStateOf`.

## Notes

- The function is **pure** and reads only four boolean/flag fields; it never inspects a numeric stock count.
- `inStock` for a preorder represents *allowance remaining*, not physical shelf stock. When the allowance is exhausted (`inStock` falsy) the product falls through to the backorder/out-of-stock branch even though `preorder` is `true`.
- An absent (`undefined`) `purchasable` is treated as on-sale; only an explicit `false` triggers `'off-sale'`.
- The module has no side effects and no other dependencies beyond the `Product` type import.
