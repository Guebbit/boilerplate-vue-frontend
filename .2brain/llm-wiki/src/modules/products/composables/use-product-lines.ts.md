---
source: src/modules/products/composables/use-product-lines.ts
sha256: 862d441d3f8afa400e643819db90c1dca10e170061f9fccc435fdfc732dd1a63
signature: b52931ec9d56e8cbb82476be20d24ab2c50414b759725e690ff748c954d11fdd
generated_at: 2026-11-10T05:19:41.172254+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/composables/use-product-lines.ts

## Purpose

Provides the `useProductLines` composable that bridges id-only "lines" (cart, wishlist) to the full `Product` records held in the shared products store. It batch-loads those records and exposes read helpers so a line's product, title, and availability label are always sourced from the single store dictionary rather than a per-line local copy.

## Key elements

- **`ProductLines` (interface)** — the contract a view receives: `loadProducts`, `productOf`, `titleOf`, `availabilityLabel`, `isRemoved`.
- **`useProductLines()` (exported function)** — the composable. Calls `useI18n`, `useProductsStore`, and `storeToRefs` once, then returns an object implementing `ProductLines`.
- **`loadProducts`** — delegates to the store's batch-fetch; no-ops (resolves `[]`) for an empty id list.
- **`productOf`** — direct dictionary read `products[productId]` from the store.
- **`titleOf`** — returns the product's `title`; `''` while loading; the i18n "removed" string after loading settles without the record.
- **`availabilityLabel`** — maps a `LineAvailability` to a localized label. Returns `undefined` for `in_stock`. For `preorder`/`backorder` without a date, falls back to an undated label (backorder uses `backorderPromiseDays` as a default day count).
- **`LABEL_KEYS` (module-level const)** — maps each non-`in_stock` availability to its i18n key literal, kept as a type-checked record so translation checks can enumerate every key.
- **`isRemoved`** — evaluates `!loading.value && productOf(productId) === undefined`; affirmative once a read has settled and the product is absent from the dictionary.

## Relationships

- **`src/modules/products/store.ts`** — the source of truth. `useProductLines` obtains the store via `useProductsStore()`, reads `products` / `loading` through `storeToRefs`, and delegates the batch fetch to a store method when `loadProducts` is called.
- **`src/modules/products/index.ts`** — module barrel; re-exports this composable (and `ProductLines`) so consumers import from the module root.
- **`src/modules/products/tests/product-lines.spec.ts`** — unit tests that exercise the composable's five methods against a mocked store.

## Notes

- `titleOf` intentionally returns an empty string (not the raw UUID) while a load is in flight, so screen readers never announce a GUID as a product name.
- `availabilityLabel` requires the caller to pass the product's `releaseDate` / `restockDate` *after* the record has loaded; until then the function returns an undated fallback label rather than crashing on `undefined`.
- Batch size is implicitly "one request per hundred ids" per the module doc-comment; the composable itself does not chunk — that is the store's responsibility.
