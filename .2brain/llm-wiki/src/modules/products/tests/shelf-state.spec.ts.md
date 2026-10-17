---
source: src/modules/products/tests/shelf-state.spec.ts
sha256: 41e397c169cc13d113ed915bfa5f9f24741bc7b5b0350fc8a03000754b713030
generated_at: 2026-10-17T01:34:18.544254+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/shelf-state.spec.ts

## Purpose

Table-driven Vitest spec that pins the precedence rules of `shelfStateOf` — the shared ranking signal used by the product card, the product page, and the add-to-cart button. It exists to lock in the priority order (off-sale > preorder > stock badge) and the "absent `purchasable` implies on-sale" convention so that a regression in any of those consumers surfaces here first.

## Key elements

- **`describe('shelfStateOf')`** — single test suite scoped to the one function under test.
- **`it.each([...])`** — nine named cases covering every meaningful combination of `purchasable`, `inStock`, and `preorder`, asserting the exact shelf-state string returned (`'in-stock'`, `'out-of-stock'`, `'off-sale'`, `'preorder'`).
- **`_label` parameter** — first tuple element is a human-readable description used only in the generated test title; the underscore prefix signals it is intentionally unused in the assertion body.

## Relationships

- **`src/modules/products/domain/index.ts`** — the import target (`../domain`). This barrel re-exports `shelfStateOf`, so the spec is coupled to the public surface of the domain module rather than to a single file.
- **`src/modules/products/domain/shelf-state.ts`** — the implementation file where `shelfStateOf` is actually defined. Changes to its branching logic will surface as failures in this spec.

## Notes

- The module doc comment at the top of the spec is the authoritative statement of the priority contract; the test cases are the executable encoding of that comment. If you change the priority, update the comment first.
- "No `purchasable` flag" is tested as a distinct case from `purchasable: false` — both resolve to the on-sale path, but the distinction is intentional: it guards against a future refactor that treats a missing key differently from `false`.
- An off-sale + preorder combination always resolves to `'off-sale'`; preorder never beats off-sale regardless of stock.
