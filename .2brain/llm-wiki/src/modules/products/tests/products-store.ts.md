---
source: src/modules/products/tests/products-store.ts
sha256: afebcfe2d97f95b9abdcc0fdfe7c7acebfec07af68ea0008a2a56e7a1475f7d8
signature: 5aede423317a1ffd8e7f7fce77899efbae0a3940e315a480f33d02c341094aa0
generated_at: 2026-11-10T05:30:10.221743+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/tests/products-store.ts

## Purpose

Test-only helper that exposes the products store to specs in other modules. The `products` barrel no longer re-exports the store, so sibling-module specs (e.g. cart) import these helpers instead of reaching into `../store` directly.

## Key elements

- **`seedProducts(...products: Product[]): void`** — Populates the store's internal dictionary by calling `addProduct` for each record, simulating a completed read.
- **`spyOnProductReads(): SpyInstance`** — Wraps `useProductsStore().fetchProductsByIds` in a `vi.spyOn`, returning the spy so callers can chain `.mockResolvedValue`, `.mockRejectedValue`, or `.mockImplementation`.

## Relationships

- **`src/modules/products/store.ts`** — Source of `useProductsStore`; this file imports it and delegates all state mutation and method access to the store instance it returns.
- **`src/modules/cart/tests/cart-view.spec.ts`** — Consumer of these helpers: seeds product data and stubs the batched read through `seedProducts` / `spyOnProductReads` rather than importing the store from the products module directly.

## Notes

- The store is intentionally **not** part of the public barrel; this file is the sanctioned test-only entry point. Adding new test helpers for the store should follow this same pattern.
- `seedProducts` mutates store state but does **not** reset it. Callers are responsible for clearing state (or relying on a fresh store per test) before calling.
