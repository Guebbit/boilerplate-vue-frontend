---
source: src/modules/products/store.ts
sha256: e2536278570a06b114b2e5840524d355632d8f0924b0f17e5a103ebf6f9e4ad4
signature: e877df22de88444ebb7b866de1ac709e6304154a76d94558764bd7ef1eaf1cfa
generated_at: 2026-11-10T05:22:17.682954+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/store.ts

## Purpose

Pinia store for the products domain. It declares the CRUD/search endpoints once, hands them to `useStructureCrudApi` (from `@guebbit/vue-toolkit`) to derive dictionary, pagination, caching, and optimistic-update state, then layers on a hard-delete action, a facets read, image-upload (multipart) branching, and a translation-locale fallback that the toolkit has no shape for.

## Key elements

- **`useProductsStore`** – The main Pinia store (`'products'`). Exposes `products` (dictionary), `productsList`, `filters`, pagination state, and CRUD actions (`addProduct`, `createProduct`, `updateProduct`, `deleteProduct`, `fetchProducts`, `fetchProduct`, etc.).
- **`invalidateProductsCache`** – Fire-and-forget helper that marks all product queries stale via TanStack `queryClient.invalidateQueries` with the `['products']` prefix. Exported for cross-module writes (e.g. cart/checkout moving stock).
- **`CreateProductData` / `UpdateProductData`** – Payload types that extend the API request types with an optional `imageUpload?: Blob`. Callers always pass `translations` as an object; JSON-string encoding for multipart happens inside the store.
- **`ProductsFilters`** – Search-criteria type (everything in `SearchProductsRequest` minus pagination, `id` as a single string, `sort` as a CSV string).
- **`configuredFallbackLocale` / `fallbackOnlyManifest`** – Produce a minimal `Language` row when `GET /locales` is unavailable (404), so `TranslationTabs` can still render.
- **`idBatches` / `SEARCH_ID_BATCH`** – Splits id lists into ≤100-item slices for the search endpoint's `id` array.
- **Multipart / JSON branching** – `create` and `update` internally choose between the JSON and multipart API calls based on whether `imageUpload` is present; `update` with upload uses `uploadThenClear` to send a JSON PATCH for `null` clears after the multipart PUT.

## Relationships

- **`src/modules/products/index.ts`** – Barrel that re-exports `useProductsStore`, `invalidateProductsCache`, and the data types so the rest of the app imports from the module root.
- **`src/modules/products/views/ProductCreate.vue`** – Calls `createProduct` with a `CreateProductData` payload (including optional `imageUpload`).
- **`src/modules/products/views/ProductEdit.vue`** – Calls `updateProduct` / `deleteProduct`; reads `currentProduct`, `loading`.
- **`src/modules/products/views/ProductTarget.vue`** – Consumes `selectedProductId`, `deleteTarget`, `resetAll` for the target/restore flow.
- **`src/modules/products/views/ProductsList.vue`** – Drives `fetchPaginationProducts`, `watchSearchProducts`, `filters`, and pagination bindings.
- **`src/modules/products/composables/use-product-lines.ts`** – Sibling composable in the same module; likely reads from `useProductsStore` for line-related data or shares the product dictionary.
- **`src/modules/products/tests/store.spec.ts`** – Unit tests for the store's CRUD, filter mapping, and multipart/JSON branching logic.
- **`src/modules/products/tests/products-store.ts`** – Test helper (mock or fixture) consumed by the other spec files.
- **`src/modules/products/tests/product-lines.spec.ts`, `product-view.spec.ts`, `products-list-view.spec.ts`, `product-fresh-stock.spec.ts`** – Spec files that exercise views/composables which in turn consume the store.

## Notes

- `translations` is **always an object** at the call-site level. The store is the single place that JSON-string-encodes it for multipart requests. Passing `undefined` would serialize to the literal string `"undefined"` in a multipart field, so the key is omitted entirely instead (spread-conditional pattern).
- `PATCH` semantics: omitting `translations` leaves all locales untouched; sending an empty map is different. The store deliberately omits the key rather than sending `{}`.
- `filters.id` is a single string at the form/URL level; the store wraps it into the one-element array the API contract requires.
- `filters.sort` is a CSV string (e.g. `"-price,title"`) at the form level; `sortTokensOf` converts it to the token list the API expects.
- Price bounds go through `boundOf` to handle locale-aware decimal separators.
- `invalidateProductsCache` is intentionally fire-and-forget: a failed background refetch leaves the stale cache visible (no flicker), and no caller needs the promise.
- The `active` filter is admin-only; the public storefront forces `active: true` server-side regardless.
