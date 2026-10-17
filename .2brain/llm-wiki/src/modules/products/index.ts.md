---
source: src/modules/products/index.ts
sha256: 3ae055e61e02ba3570d73390b1c1d0471b1d3c5f896d991e3a61385b3d826175
generated_at: 2026-10-17T01:28:18.595591+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/index.ts

## Purpose

Public barrel (re-export surface) for the Products module. It is the **only** entry point that sibling modules are allowed to import; lint rules flag any direct import of `./store` from outside the module as an error. The file exists to keep the cross-module contract narrow and stable.

## Key elements

- **`useProductsStore`** (re-exported from `./store`) — the module's Pinia-style store for product data.
- **`invalidateProductsCache`** (re-exported from `./store`) — cache-invalidation call intended for stock-moving writes.
- **`useProductLines`** (re-exported from `./composables/use-product-lines`) — composable that joins id-only line items (cart, wishlist) to their full product records.
- **`shelfStateOf`** (re-exported from `./domain`) — domain helper (exact signature lives in `domain/index.ts`).

## Relationships

- **`src/modules/products/store.ts`** — source of `useProductsStore` and `invalidateProductsCache`; this barrel is the sole path other modules use to reach the store.
- **`src/modules/products/composables/use-product-lines.ts`** — source of `useProductLines`.
- **`src/modules/products/domain/index.ts`** — source of `shelfStateOf`.

All three are internal to the module; no sibling module should import them directly.

## Notes

- **Surface is contractual.** The JSDoc explicitly treats each re-export as a promise to every consuming module that its shape will not change. Add an export only when a sibling genuinely needs it.
- **Lint-enforced boundary.** Importing `./store` (or any other sub-path) from a sibling module is a lint error; the barrel is not optional indirection.
- **No new logic here.** The file contains only re-exports and documentation comments—there is no runtime behavior to test at this level.
