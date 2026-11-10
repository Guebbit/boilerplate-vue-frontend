---
source: src/modules/products/domain/index.ts
sha256: c293e855c32f6221fd2ad5a2304b5dec0d8fddf9082eaa79334e8225f80d3620
signature: c293e855c32f6221fd2ad5a2304b5dec0d8fddf9082eaa79334e8225f80d3620
generated_at: 2026-11-10T05:20:32.299389+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/domain/index.ts

## Purpose

Barrel file for the products domain layer. It re-exports the public API of pure business rules (no Vue, Pinia, axios, or framework dependencies) so consumers can import from a single stable entry point.

## Key elements

- **`export { shelfStateOf }`** — re-exports the `shelfStateOf` function from `./shelf-state`.
- **`export type { ShelfState }`** — re-exports the `ShelfState` type from `./shelf-state`.

## Relationships

- **`src/modules/products/domain/shelf-state.ts`** — sole source; all exports in this file originate from it.
- **`src/modules/products/index.ts`** — upstream barrel that (re)exports from this module so the rest of the app can reach the domain API.
- **`src/modules/products/components/ProductCard.vue`** and **`src/modules/products/views/ProductTarget.vue`** — consumers that import `shelfStateOf` / `ShelfState` through this entry point.
- **`src/modules/products/tests/shelf-state.spec.ts`** — test suite for `shelfStateOf`; imports the symbol (via this index or directly from `shelf-state.ts`).

## Notes

- The module is a pure re-export; it defines no logic itself. Adding a new domain symbol means adding one `export` line here and updating `shelf-state.ts` (or a sibling file).
- The doc comment enforces a lint boundary: nothing from Vue, Pinia, or axios may be pulled into this file or its transitive imports.
