Based on my analysis of the codebase, here's the detailed implementation plan:

---

# VUEQUERY_PLAN.md

## Phase 1: Install and configure Vue Query

### 1.1 Install `@tanstack/vue-query`

```bash
npm install @tanstack/vue-query
```

### 1.2 Register Vue Query in `src/main.ts`

Add a `QueryClient` instance and provide it via `VueQueryPlugin`:

```ts
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 min cache
            retry: 1
        }
    }
});
app.use(VueQueryPlugin);
```

---

## Phase 2: Add the vue-query orval target

### 2.1 Update `orval.config.ts`

Add a fourth output target `vueQuery`:

```ts
vueQuery: {
    input: './openapi.yaml',
    output: {
        mode: 'single',
        target: './src/api/query.ts',
        client: 'vue-query',
        override: {
            mutator: {
                path: './src/utils/apiMutator.ts',
                name: 'apiMutator'
            }
        }
    }
}
```

The `apiMutator` ensures the generated queries use the same `httpClient` instance that handles auth headers, token refresh, and response unwrapping.

### 2.2 Add `@api/query` alias in `vite.config.ts` and `tsconfig.app.json`

### 2.3 Run `npm run genapi`

This generates composables like:

- `useListProducts()` / `useGetProductById(productId)`
- `useCreateProduct()` / `useUpdateProductById()` / `useDeleteProductById()`
- One set for every endpoint in `openapi.yaml`

---

## Phase 3: Migrate `products` feature (proof of concept)

### 3.1 Create `src/features/products/useProductsQuery.ts`

Wrap the generated composables into a feature-level composable that returns:

- `{ data, isLoading, error }` for queries
- `{ mutate, isError }` for mutations
- Cache invalidation helpers (after create/update/delete, invalidate `products` queries)

### 3.2 Update `ProductsList.vue`, `Product.vue`, `ProductEdit.vue`

Replace `useProductsStore()` with the new `useProductsQuery()` composable:

- `fetchProducts()` → `useListProducts()`
- `fetchProduct(id)` → `useGetProductById(id)`
- `createProduct()` → `useCreateProduct()` with `onSuccess` invalidation
- `updateProduct()` → `useUpdateProductById()` with `onSuccess` invalidation
- `deleteProduct()` → `useDeleteProductById()` with `onSuccess` invalidation

### 3.3 Simplify `src/features/products/store.ts`

Remove all `useStructureRestApi`-related code. Keep only:

- Zod validation schemas (or move them to use the generated `@api/schemas` Zod schemas)
- Any state that can't be query-based

### 3.4 Verify with tests

Run existing Cypress E2E tests for products to ensure behavior is preserved.

---

## Phase 4: Migrate remaining features

Migrate in order of complexity:

1. **users** — straightforward CRUD, similar to products
2. **orders** — CRUD with status transitions
3. **cart** — simpler state, can use Vue Query

### What stays in Pinia

- `stores/profile.ts` — manages global auth token state (access token, refresh, user identity)
- `stores/counter.ts` — demo/UI-only counter
- `stores/realtimeChat.ts` / `stores/realtimeObservability.ts` — WebSocket-based, not HTTP
- `stores/observability.ts` — Sentry/PostHog integration

---

## Phase 5: Move mocks from `tests/mocks`

### Current location: `tests/mocks/`

This is a hidden directory (dot prefix) which makes it less discoverable and inconsistent with the project's explicit naming conventions.

### Proposed location: `src/mocks/`

This aligns with the pattern of other `src/` subdirectories and makes it clear these are source-level dev utilities.

### Steps:

1. Move `tests/mocks/` → `src/mocks/`
2. Update all imports:
    - `apiMock.ts` entry point (check where it's imported)
    - Any references in `vite.config.ts`, test setup, or MSW configuration
3. Update orval's mocks target to output to `src/mocks/generated.ts` instead of `tests/mocks/generated.ts`
4. Remove the now-empty `.dev/` directory

---

## Trade-offs & Considerations

| Aspect                         | Decision                                                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mutator for vue-query target   | Reuse `apiMutator.ts` so queries benefit from the same auth/token refresh logic                                                                                         |
| Cache strategy                 | 5-minute `staleTime` default; override per-feature as needed                                                                                                            |
| Multipart uploads              | Vue Query mutations work, but the `withOptionalMultipartUpload` wrapper from products store needs to be called in the mutation's body rather than as the query function |
| Generated vs. hand-written Zod | After migration, prefer `@api/schemas` (generated) over hand-written Zod in stores                                                                                      |
| `useStructureRestApi` removal  | Only remove from migrated stores; keep the `@guebbit/vue-toolkit` dependency until all stores are migrated                                                              |

---

## Estimated effort

| Phase                             | Effort    |
| --------------------------------- | --------- |
| Phase 1: Install Vue Query        | 15 min    |
| Phase 2: orval vue-query target   | 30 min    |
| Phase 3: Products migration (PoC) | 2-3 hours |
| Phase 4: Remaining features       | 3-4 hours |
| Phase 5: Move mocks               | 30 min    |

**Total: ~7-9 hours**

---

Does this plan look good to you? Any adjustments you'd like to make before I switch to Act mode and start implementing?
