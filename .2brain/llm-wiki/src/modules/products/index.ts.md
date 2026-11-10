---
source: src/modules/products/index.ts
sha256: a6def57dc52474d20ddfa9788054974512dc87831220e9bc9332147aa74e6872
signature: a6def57dc52474d20ddfa9788054974512dc87831220e9bc9332147aa74e6872
generated_at: 2026-11-10T05:21:02.668085+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/index.ts

## Purpose

Public barrel for the Products module. It exposes a deliberately narrow set of re-exports so that sibling modules can interact with product data without reaching into the internal store. Lint enforces that importing `./store` directly from outside this module is an error; this file is the only sanctioned entry point.

## Key elements

- **`invalidateProductsCache`** (from `./store`) — called by a stock-moving write to drop the cached product state.
- **`useProductLines`** (from `./composables/use-product-lines`) — composable that joins id-only product lines (cart, wishlist) to their full product records.
- **`shelfStateOf`** (from `./domain`) — computes the shelf-state rank for a product.

No logic lives in this file; it is purely a re-export surface.

## Relationships

- Re-exports one symbol from each of its three graph neighbors: `invalidateProductsCache` ← `src/modules/products/store.ts`, `useProductLines` ← `src/modules/products/composables/use-product-lines.ts`, `shelfStateOf` ← `src/modules/products/domain/index.ts`.
- Acts as the **only** import target allowed for sibling modules (enforced by lint). Any new cross-module need must be added here as a new explicit export.

## Notes

- The export list is treated as a **stability contract**: every other module may rely on the shapes staying the same. Add an export only when a sibling genuinely needs it.
- The internal store object itself is never re-exported. If a sibling needs something new from the store, wrap it in a purpose-specific function first, then export that.
- Test code bypasses this barrel entirely, importing the store through `src/modules/products/tests/products-store.ts` instead.
