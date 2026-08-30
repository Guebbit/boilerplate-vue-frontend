# src/modules/users/store.ts

## Purpose
Pinia store providing CRUD, paginated search, and avatar-upload support for users. It delegates nearly all wiring to the shared `useStructureCrudApi` primitive so that the only hand-written logic is the multipart branching for avatar uploads and the irreversible `hardDeleteUser` action.

## Key elements
- **`useUsersStore`** — The exported Pinia store (`defineStore('users', …)`). Exposes record cache, list/pagination state, CRUD actions, and search/watch helpers consumed by components.
- **`UsersFilters`** — Local type alias: `Omit<SearchUsersRequest, 'page' | 'pageSize'>`. Pagination fields are owned by the toolkit; everything else is the store's filter surface.
- **Multipart branching (create/update)** — Inside the `create` and `update` callbacks passed to `useStructureCrudApi`, the presence of an `imageUpload` field routes the call to `createUserWithMultipart` / `updateUserByIdWithMultipart` instead of the JSON-body variants.
- **`hardDeleteUser(userId)`** — Hand-written action that calls `hardDeleteUserById` through the toolkit's `deleteTarget` helper. Intentionally a separate method from `deleteUser` (soft delete) so the irreversible path cannot be triggered by a mis-set boolean flag.
- **`optimisticPatch`** — Strips `imageUpload` from the patch object so a `Blob` is never stored in reactive state; the API response supplies the resulting `imageUrl`.
- **`getLoading` / `setLoading`** — Pulled from `useCoreStore` and forwarded into `useStructureCrudApi`, giving per-key loading flags namespaced under this store's name.

## Relationships
No external graph neighbors are recorded for this file. Internally it depends on `@guebbit/vue-toolkit` (`useCoreStore`, `useStructureCrudApi`), the `@api` endpoint functions, and `@types` interfaces, but none of those appear as separate tracked files in the dependency graph.

## Notes
- The file's own comment states it is **deliberately shape-identical to the products store**; treat any structural divergence between the two as a bug, not an intentional difference.
- `deleteUser` (soft) and `hardDeleteUser` (irreversible) are **distinct methods by design**—do not collapse them into a single action with a boolean parameter.
- Pagination (`page`, `pageSize`, `pageCurrent`, `pageTotal`, `pageItemList`) is owned entirely by the toolkit primitive; the store never sets them directly. Components should use `fetchPaginationUsers` / `watchSearchUsers` rather than mutating page state by hand.
- The `AxiosRequestConfig` generic is passed as the sixth type parameter to `useStructureCrudApi`, enabling per-call `options` (e.g. headers, timeout) to flow through `create`/`update` without extra plumbing.
