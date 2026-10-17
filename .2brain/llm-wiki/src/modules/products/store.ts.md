---
source: src/modules/products/store.ts
sha256: f85698f2f1bad07ca36051064ba3c410820bfa8e7e05115c6f9b8101bdaaadfb
generated_at: 2026-10-17T01:29:08.063068+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/store.ts

## Purpose

Pinia store for the products domain. It declares the CRUD/search endpoints once, hands them to `useStructureCrudApi` (from `@guebbit/vue-toolkit`) to derive dictionary, pagination, caching, and optimistic-update state, then layers on a hard-delete action, a facets read, and a cache-invalidation helper that other modules can call.

## Key elements

- **`useProductsStore`** — the main `defineStore('products', …)` export. Unwraps `useStructureCrudApi` into `products` (item dictionary), `productsList`, `addProduct`, `selectedProductId`, `currentProduct`, `filters`, pagination refs, `fetchProducts` / `fetchPaginationProducts` / `watchSearchProducts`, `fetchProduct` / `watchProduct`, `createProduct`, `updateProduct`, `deleteProduct`, `deleteTarget`, `fetchAny`, `fetchMultiple`.
- **`invalidateProductsCache`** — fire-and-forget `queryClient.invalidateQueries` on the `[PRODUCTS_RESOURCE_KEY]` prefix; exported so other modules (cart, checkout) can mark product caches stale after writes that affect stock.
- **`CreateProductData` / `UpdateProductData`** — payload types that extend the API request types with an optional `imageUpload?: Blob`. `translations` stays an object at this level; JSON-stringification for the multipart branch happens inside the store.
- **`ProductsFilters`** — local filter shape; keeps `id` as a single string and `sort` as a CSV, converting both into the wire contract inside the `search:` closure.
- **`idBatches`** / **`SEARCH_ID_BATCH` (100)** — splits a list of ids into API-acceptable request-sized chunks for batched fetches.
- **`create:` / `update:` closures** — branch on `imageUpload` presence: multipart call (with `translations` JSON-stringified) vs. plain JSON call. Update with a file uses `uploadThenClear` so that a subsequent JSON PATCH can carry `null` clears that multipart cannot express.
- **`optimisticPatch`** — strips `imageUpload`, `translations`, and any `null` field values (`weight`, `imageUrl`, `taxClass`, `rateType`, `sku`, `releaseDate`) so the optimistic guess never includes values the server will overwrite.

## Relationships

- **`src/modules/products/index.ts`** — barrel file that re-exports `useProductsStore`, `invalidateProductsCache`, and the payload types for the rest of the app.
- **`src/modules/products/views/Product.vue`**, **`ProductCreate.vue`**, **`ProductEdit.vue`**, **`ProductsList.vue`** — Vue components that consume `useProductsStore` for fetching, creating, updating, deleting products and reading pagination/filter state.
- **`src/modules/products/composables/use-product-lines.ts`** — composable in the same module; interacts with product data for line-level concerns.
- **`src/modules/products/tests/store.spec.ts`** — dedicated unit tests for this store's actions and state.
- **Other spec files** (`product-fresh-stock.spec.ts`, `product-lines.spec.ts`, `product-view.spec.ts`, `products-list-view.spec.ts`) — integration/view-level tests that exercise the store indirectly through the components.

## Notes

- **Translations encoding is store-local.** Callers always pass `translations` as a plain object. The store JSON-stringifies it *only* on the multipart branch; on the JSON branch it is passed through. On PATCH, omitting the key (via `translations !== undefined && { translations }`) means "leave all locales alone," which is semantically different from sending an empty map.
- **`id` in filters is a single string.** The API's `POST /products/search` expects an array; the store wraps it (`[filters.id]`) at the boundary so forms and URLs stay simple.
- **`sort` is a CSV in filters** (`"-price,title"`) and is converted via `sortTokensOf(filters.sort, ProductSortItem)` at the call site.
- **Cache is scoped by locale** (`getCurrentLocale()` in the query key), because server-resolved text (`title`, `description`) is locale-specific.
- **`invalidateProductsCache` is intentionally fire-and-forget.** Callers do not await it; a failed background refetch leaves the cached copy showing.
- **Optimistic patch deliberately excludes `imageUrl`, `translations`, and the uploaded `Blob`.** Those values are only known after the server response, so they remain at their previous rendered state until the real record arrives.
