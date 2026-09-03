# src/modules/products/index.ts

## Purpose

Barrel file that defines the public import surface for the products module. It exists to enforce a single, narrow re-export contract: sibling modules must import through this file rather than reaching into the module's internals, a rule backed by lint.

## Key elements

- **`useProductsStore`** (re-export) — the sole public export, forwarded from `./store`. This is the only symbol other modules are permitted to pull from the products module.

## Relationships

- **`src/modules/products/store.ts`** — the sole source of this file's export. All other modules in the codebase consume `useProductsStore` via this barrel, never by importing `store` directly.

## Notes

- Lint treats a direct `@/modules/products/store` import from a sibling module as an error, not a warning. Adding a new export here is a deliberate API decision; the file's doc comment frames each export as a stability promise to every consumer.
- Do not re-export intermediate helpers or types "for convenience" — the surface is intentionally minimal.
