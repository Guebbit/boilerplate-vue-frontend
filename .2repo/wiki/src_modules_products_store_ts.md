# src/modules/products/store.ts

## Purpose

Pinia store for the products domain. Declares CRUD/search endpoints once and delegates the bulk of state (dictionary, pagination, filters, caching, optimistic updates) to `useStructureCrudApi` from `@guebbit/vue-toolkit`. Layers two additions the toolkit has no shape for: an irreversible hard-delete action and a catalogue facets read.

## Key elements

- **`useProductsStore`** — the single exported Pinia store (`'products'`). All public state and actions are derived from or added on top of `useStructureCrudApi<Product, string, ProductsFilters, …>`.
- **`ProductsFilters`** — local type alias: `SearchProductsRequest` minus `page`/`pageSize` (pagination is owned by the toolkit's search state).
- **Endpoint wiring (inline config object)** — maps `list`, `search`, `get`, `create`, `update`, `remove`, and `optimisticPatch` to the concrete API functions imported from `@api`. `create`/`update` branch between JSON and multipart calls depending on the presence of `imageUpload`.
- **TTL: 5 min** — passed as the toolkit's cache option; deliberately shorter than the 1-hour default so admin edits surface in the public listing quickly.
- **`hardDeleteProduct(productId)`** — permanent delete via `hardDeleteProductById`, routed through the toolkit's `deleteTarget` so it participates in the same loading/rollback lifecycle as the soft `deleteProduct`.
- **`facets` / `fetchFacets`** — local `ref` + fetch helper for catalogue category/tag counts; uses the toolkit's `fetchAny` for consistent loading-flag handling. API-side caching keeps counts fresh without store-level invalidation.
- **Exported surface** — the `return` block of the setup store re-exposes the toolkit's renamed refs/actions (`products`, `productsList`, `addProduct`, `selectedProductId`, `currentProduct`, `filters`, `loading`, `pageCurrent`, `pageSize`, `pageTotal`, `pageItemList`, `fetchProducts`, `fetchPaginationProducts`, `watchSearchProducts`, `fetchProduct`, `watchProduct`, `createProduct`, `updateProduct`, `deleteProduct`) plus the two additions (`facets`, `fetchFacets`, `hardDeleteProduct`).

## Relationships

- **`src/modules/products/index.ts`** — barrel file that re-exports `useProductsStore` (and the `ProductsFilters` type) so consumers import from the module path rather than reaching into the store file directly.

## Notes

- **Multipart vs. JSON split**: `create` and `update` destructure `imageUpload` out of the payload and choose the endpoint at call time. The JSON path is preferred when no file is present (cheaper body, no stream parsing on the server).
- **`optimisticPatch` strips the blob**: the uploaded `imageUpload` is omitted from the local optimistic patch so the preview doesn't stay on already-uploaded bytes while the server returns the final `imageUrl`.
- **Search param naming**: the filter field is `id` (not `productId`) to match the API spec on both the GET query and the POST `/products/search` body.
- **Hard-delete is a separate method**, not a flag on `deleteProduct`, to make the irreversible action opt-in by name rather than by a boolean that could be passed incorrectly.
- **Loading state is shared** via `useCoreStore().getLoading / setLoading`, keyed to this store's identifier, so the global loading indicator reflects product operations.
