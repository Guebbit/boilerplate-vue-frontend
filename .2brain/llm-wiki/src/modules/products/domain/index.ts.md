---
source: src/modules/products/domain/index.ts
sha256: 09b1b80c4df91e4375816f29fa74b2b2f1483724d35ef8002ecdebe4a5c33a5f
generated_at: 2026-10-17T01:27:55.757470+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/domain/index.ts

## Purpose

Barrel (re-export) file for the **products domain layer**. It aggregates the public API of the pure domain rules—shelf-state logic and release-date formatting—behind a single import path so consumers never reach into individual domain modules. The module doc explicitly declares the layer free of Vue, Pinia, axios, and every other framework tier.

## Key elements

- **`shelfStateOf`** (re-exported from `./shelf-state`) — computes a product's shelf state.
- **`ShelfState`** (type re-export from `./shelf-state`) — the union/literal type representing possible shelf states.
- **`toDateTimeLocal`** (re-exported from `./release-date`) — converts a date/time value to a `<input type="datetime-local">` string.
- **`fromDateTimeLocal`** (re-exported from `./release-date`) — parses a `datetime-local` string back into a structured date/time value.

## Relationships

- **`./shelf-state`** and **`./release-date`** — the two source modules whose members this file re-exports.
- **`src/modules/products/index.ts`** — the module-level barrel; expected to re-export (or depend on) this domain barrel to surface the API to the rest of the app.
- **`ProductCard.vue`, `Product.vue`, `ProductCreate.vue`, `ProductEdit.vue`** — UI-layer consumers that import domain helpers/types through this path.
- **`tests/release-date.spec.ts`**, **`tests/shelf-state.spec.ts`** — unit tests exercising the two re-exported rule modules.

## Notes

- This file contains **no logic of its own**—only `export … from` statements. Adding any implementation here would violate the domain-layer purity contract stated in the JSDoc (`docs/theory/domain-layer.md`).
- The `ShelfState` export is a **type-only** re-export (`export type`), so it disappears at runtime. Use `import type { ShelfState }` if you only need the type.
- Because the file is a re-export barrel, tree-shaking and IDE "go to definition" pass through to the original `./shelf-state` or `./release-date` file.
