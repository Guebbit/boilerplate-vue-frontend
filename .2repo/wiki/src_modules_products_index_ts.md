# src/modules/products/index.ts

## Purpose

Public barrel file for the `products` module. It is the **only** entry point sibling modules are permitted to import from; all other files in the module are considered internal and are blocked by lint rules.

## Key elements

- **`useProductsStore`** — Re-exported from `./store`. This is the single named export and the sole public API of the products module.

## Relationships

- **`src/modules/products/store.ts`** — The actual definition of `useProductsStore` lives here. This barrel forwards that one symbol outward; no other file in the module is re-exported.

## Notes

- Lint enforces the barrel boundary: a sibling module importing `@/modules/products/store` directly is an error, not a shortcut.
- Adding a new export here is an intentional, public-API decision — the header comment explicitly warns to add one only when a sibling genuinely needs it.
- The file contains no logic; it is purely a re-export with documentation.
