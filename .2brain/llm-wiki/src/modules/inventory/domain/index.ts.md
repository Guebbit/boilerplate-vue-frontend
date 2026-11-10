---
source: src/modules/inventory/domain/index.ts
sha256: 5749c0008102259502e820260bfa90d39138963a29ebdd534114dc76ade73d9a
signature: 5749c0008102259502e820260bfa90d39138963a29ebdd534114dc76ade73d9a
generated_at: 2026-11-10T04:31:38.375368+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/domain/index.ts

## Purpose

Barrel file that exposes the public surface of the inventory domain layer. It exists so consumers (UI components, tests) import domain rules from a single stable path (`./domain`) rather than reaching into individual implementation files. The module doc-block states the invariant: everything re-exported here must be pure logic, free of Vue, Pinia, axios, and any other tier.

## Key elements

- **`preorderRows`** (re-exported from `./preorder-rows`) — the core domain function; transforms raw preorder data into a normalized row shape.
- **`PreorderRow`** (type, re-exported from `./preorder-rows`) — the TypeScript type describing the shape each row returned by `preorderRows` must conform to.

## Relationships

- **`src/modules/inventory/domain/preorder-rows.ts`** — the sole implementation module this index re-exports. All symbols in this file originate there.
- **`src/modules/inventory/components/PreorderProductsTable.vue`** — downstream consumer; imports the domain function/type through this index to render the preorder table without coupling to the internal file path.
- **`src/modules/inventory/tests/preorder-rows.spec.ts`** — test suite that imports `preorderRows` / `PreorderRow` (via this index or the relative file) to verify domain rules in isolation.

## Notes

- The doc-block references `docs/theory/domain-layer.md` for the architectural rationale; the lint rules that enforce the "no Vue/Pinia/axios" boundary are configured externally, not in this file.
- Adding a new domain export means appending a re-export line here *and* implementing it in the appropriate `./`-relative module. Forgetting to add it here leaves the new symbol invisible to consumers that import from `domain`.
