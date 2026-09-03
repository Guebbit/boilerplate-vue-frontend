# src/modules/products/store.ts

## Purpose

Pinia store for the products domain. It declares the CRUD/search endpoints once and delegates all derived state (dictionary, filters, pagination, caching, optimistic updates, rollback) to the toolkit's `useStructureCrudApi`, then layers on two things the toolkit has no shape for: a hard-delete action and a facets read.

## Key elements

- **`useProductsStore`** — the sole export; a setup-store defined via `defineStore('products', …)`.
- **`ProductsFilters`** — local type alias for `Omit<SearchProductsRequest, 'page' | 'pageSize'>`, i.e. the search criteria minus pagination (which the toolkit owns).
- **`useStructureCrudApi<…>` call** — the backbone. Receives `list`, `search`, `get`, `create`, `update`, `remove`, `optimisticPatch` callbacks and a config object (`getLoading`, `setLoading`, `TTL`). Returns the full public surface: `products`, `productsList`, `addProduct`, `selectedProductId`, `currentProduct`, `filters`, `loading`, `pageCurrent`, `pageSize`, `pageItemList`, and the fetch/watch/create/update/delete actions.
- **`create` / `update` callbacks** — destructure `imageUpload` out of the payload; route to the multipart API variant only when a file is present, otherwise send plain JSON.
- **`optimisticPatch`** — strips `imageUpload` (a `Blob`) from the local patch so the preview doesn't linger on already-uploaded bytes.
- **`useServerPageTotal`** — provides the real `pageTotal` for server-paginated search; `captureTotal` is called inside the `search` callback when `response.data.meta.totalPages` arrives. The toolkit's own `pageTotal` is renamed to `_localOnlyPageTotal` and unused.
- **`hardDeleteProduct(productId)`** — calls `deleteTarget` with `hardDeleteProductById`; permanent, irreversible removal (as opposed to the soft `deleteProduct` that sets `deletedAt`).
- **`facets` / `fetchFacets`** — a `ref` holding `{ categories, tags }` filter-chip data; loaded via `getCatalogueFacets` and wrapped in `fetchAny` for loading-state tracking.

## Relationships

- **`src/modules/products/index.ts`** — barrel file for the products module; re-exports `useProductsStore` (and likely related types) so consumers import from the module root rather than the store file directly.

## Notes

- **TTL override:** the store sets `TTL: 5 * 60 * 1000` (5 min) instead of the toolkit's 1-hour default, because visitors and admins see/edit products concurrently and a price change must propagate quickly. Expired entries still render while the refetch runs, so the cost is a background request, not a spinner.
- **Search `id` field:** the filter is named `id` (not `productId`) because that is what the API spec uses on both the GET query and the POST `/products/search` body.
- **`_localOnlyPageTotal`:** the toolkit's `pageTotal` is deliberately unused for the paginated search; it counts local items and would give a wrong number. The server-paginated value from `useServerPageTotal` shadows it in the returned object.
- **`hardDeleteProduct` is not a declared operation:** it is written against `deleteTarget` rather than registered as a `remove` variant, keeping the soft-delete as the single canonical `remove` and making the irreversible path a distinct, explicit method.
- **Multipart only when needed:** the `create`/`update` callbacks send JSON by default; multipart is used solely when `imageUpload` is present, avoiding unnecessary stream parsing.
