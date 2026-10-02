---
source: src/modules/orders/domain/index.ts
sha256: de2f8f89b6c56867ad0579670d93d47adb408c81c30b6c5cd130e5dce0dcca33
generated_at: 2026-10-02T15:20:33.106074+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/domain/index.ts

## Purpose

Barrel file that re-exports the public surface of the orders domain layer. It exists so consumers import from a single entry point (`./domain`) rather than reaching into individual files, and so the module's doc comment can state the layer's contract (pure rules, no Vue/Pinia/axios) in one place.

## Key elements

- **`leftOutByReorder`** (re-exported function from `./reorder`) — the only value export; implements a domain rule related to reordering order lines.
- **`ReorderedOrderLine`** (re-exported type from `./reorder`) — the type shape produced by the reorder operation.

## Relationships

- **`src/modules/orders/domain/reorder.ts`** — sole dependency. This file imports nothing from it at runtime beyond the two symbols above; all logic lives in `reorder.ts`.

## Notes

- The JSDoc `@module` tag and the tier-purity comment are the authoritative statement of what *belongs* in this layer. When adding new exports, ensure they carry no framework imports.
- Because this is a re-export-only file, lint rules that enforce "no Vue/Pinia/axios in domain" are effectively guaranteed by the fact that the only real code lives in `reorder.ts`. Keep it that way.
- The layer's design rationale is documented in `docs/theory/domain-layer.md` (referenced in the file header).
