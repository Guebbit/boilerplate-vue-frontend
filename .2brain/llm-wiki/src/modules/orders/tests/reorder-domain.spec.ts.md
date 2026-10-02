---
source: src/modules/orders/tests/reorder-domain.spec.ts
sha256: 6fe0df09c88f3c80a436195202bc2bd05f05ef3b9a3ffd073b849b0877e974a4
generated_at: 2026-10-02T15:23:41.627188+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/reorder-domain.spec.ts

## Purpose

Unit tests for the pure function `leftOutByReorder`, which reports which product lines from a past order were **not** picked up by the current cart. Because the function is pure (plain array in, plain array out), the tests use inline literal data with no fixtures or mocks.

## Key elements

- **`describe('leftOutByReorder', …)`** — Vitest suite block; imports the function under test from `@/modules/orders/domain`.
- **Test: "names nothing when every product landed"** — asserts the function returns `[]` when every line's product id appears in the cart-id list (order of the cart list does not matter).
- **Test: "names the products the cart lacks, in the order the lines came"** — asserts missing lines are returned as an array of product **titles**, preserving the original line order.
- **Test: "falls back to the id when the frozen line has no title"** — asserts that when a line's `title` is an empty string, the product `id` is used as the fallback display value.

## Relationships

- Imports `leftOutByReorder` from `src/modules/orders/domain` (the SUT).
- Uses `describe`, `expect`, `it` from `vitest` (test runner globals).

## Notes

- The module-level doc comment explicitly states the function is **pure** and that "the cases are plain arrays"—this is the contract the tests rely on (no objects with methods, no side effects to stub).
- The second test reveals the return value is an array of **display strings** (titles, or ids as fallback), not product objects.
- The input shape is `{ product: { id, title } }` per line; the cart parameter is a flat array of product id strings.
