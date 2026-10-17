---
source: src/modules/inventory/domain/index.ts
sha256: 5749c0008102259502e820260bfa90d39138963a29ebdd534114dc76ade73d9a
generated_at: 2026-10-17T00:58:48.434405+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/domain/index.ts

## Purpose

Barrel file for the inventory **domain layer**. It re-exports the pure domain rules (currently `preorderRows`) so consumers can import from a single path (`@/modules/inventory/domain`) without reaching into individual files. The domain layer is lint-guaranteed to be free of Vue, Pinia, axios, and all other application tiers.

## Key elements

- **`preorderRows`** (function) — re-exported from `./preorder-rows`; the sole business-rule function in the domain layer.
- **`PreorderRow`** (type) — re-exported from `./preorder-rows`; the row shape produced by `preorderRows`.

## Relationships

- **`domain/preorder-rows.ts`** — the only real dependency; this index re-exports everything from it.
- **`components/PreorderProductsTable.vue`** — a UI-tier consumer that imports `preorderRows` / `PreorderRow` through this index.
- **`tests/preorder-rows.spec.ts`** — unit tests for the domain logic; exercises the same exports.

## Notes

- This file contains **no logic** of its own — editing it is purely an export-surface change.
- The domain layer is enforced as dependency-free by lint rules (see `docs/theory/domain-layer.md`). Adding any Vue/Pinia/axios import here or in its transitive deps will fail the build.
