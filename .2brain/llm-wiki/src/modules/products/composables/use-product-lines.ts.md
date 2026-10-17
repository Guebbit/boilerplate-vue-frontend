---
source: src/modules/products/composables/use-product-lines.ts
sha256: ac8b1c8611c94a3d9674f0d319c715470b010160b702b7964159191b7c45502d
generated_at: 2026-10-17T01:27:32.121112+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/composables/use-product-lines.ts

## Purpose

Provides the id-to-record join that id-only product lines (cart, wishlist) need: batch-loads the full `Product` records into the shared products store, then exposes small readers (`productOf`, `titleOf`, `availabilityLabel`, `isRemoved`) so any line's view resolves against the same dictionary the product page uses, rather than a private copy.

## Key elements

- **`ProductLines`** (interface) — the contract handed to a view: `loadProducts`, `productOf`, `titleOf`, `availabilityLabel`, `isRemoved`.
- **`LABEL_KEYS`** (const) — maps each non-`in_stock` `LineAvailability` literal to its i18n key, kept as a `Record` so translation tooling can enumerate every key.
- **`useProductLines()`** (composable) — binds `useProductsStore` and `useI18n`; returns the `ProductLines` object. Must be called once in a component's `setup`.

## Relationships

- **`src/modules/products/store.ts`** — source of the `products` dictionary, the `loading` flag, and the `fetchProductsByIds` action that `loadProducts` delegates to.
- **`src/modules/products/index.ts`** — barrel file; re-exports this composable so consumers import from the module root.
- **`src/modules/products/tests/product-lines.spec.ts`** — unit tests for the readers and availability-label logic.

## Notes

- `loadProducts` short-circuits to `Promise.resolve([])` when the id array is empty — it never fires a request for zero ids.
- `titleOf` returns `''` (not the raw UUID) while a fetch is in flight, so screen readers never announce a GUID.
- `availabilityLabel` returns `undefined` for `in_stock`; callers should treat that as "no badge needed."
- A `preorder` line whose product record hasn't loaded yet (no `releaseDate`) falls back to the undated `product-lines.preorder-undated` key.
- `isRemoved` is deliberately `false` during `loading` — the composable cannot distinguish "not yet fetched" from "genuinely removed" until the request settles.
