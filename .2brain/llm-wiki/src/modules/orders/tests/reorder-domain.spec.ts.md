---
source: src/modules/orders/tests/reorder-domain.spec.ts
sha256: 849651e62a6ecfb89ab42f3fbeb4cb5d883e65a784313576789eeca3407f26d9
generated_at: 2026-10-17T01:18:58.403814+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/reorder-domain.spec.ts

## Purpose

Vitest spec that pins down the behavior of `leftOutByReorder` — a pure domain function that returns the titles (or ids) of order-line products the cart failed to restore. Exists so the reorder-domain contract is locked by executable examples rather than prose.

## Key elements

- **`describe('leftOutByReorder')`** — single test suite covering three behavioral cases:
  - All products present → returns `[]`.
  - Some products missing → returns their titles **in the order the original lines appeared**.
  - A line with an empty `title` → the function falls back to the product `id`.

## Relationships

- **`src/modules/orders/domain/index.ts`** — the test imports `leftOutByReorder` from this barrel module (`../domain`). It is the re-export point that makes the function available to consumers and to this spec.
- **`src/modules/orders/domain/reorder.ts`** — where `leftOutByReorder` is actually implemented; this spec exercises that implementation through the barrel re-export.

## Notes

- Test fixtures are deliberately **plain arrays of `{ product: { id, title } }` objects** (the module doc comments call them "plain arrays") to keep the spec free of ORM/DTO wrappers.
- The fallback case uses `title: ''` (empty string), not `title: undefined` or a missing key — the domain function checks for falsy title, so the spec mirrors that exact shape.
- Order preservation is asserted: the expected array is `['Alpha', 'Gamma']`, matching the original line order, not alphabetical or set-based order.
