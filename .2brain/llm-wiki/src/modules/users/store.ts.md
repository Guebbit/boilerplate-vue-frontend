---
source: src/modules/users/store.ts
sha256: a8a42527386256a84ce4e28636dcec6d4301fc94c1cbad0f656be1f55d41595e
generated_at: 2026-10-17T01:46:56.970147+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/store.ts

## Purpose

Pinia store that provides all users-domain state (record cache, list/pagination, CRUD actions, avatar upload) to the user views. It is built on `useStructureCrudApi` from `@guebbit/vue-toolkit`, which generates the boilerplate CRUD/pagination plumbing; this file only supplies the endpoint bindings, the multipart-vs-JSON branching, and two hand-written actions (`hardDeleteUser`, `restoreUser`). The store is intentionally shape-identical to `products/store.ts` apart from endpoints and filters.

## Key elements

- **`useUsersStore`** — the exported Pinia store (`defineStore('users', …)`). Destructures the full `useStructureCrudApi` bundle and re-exports it under user-domain names (`users`, `usersList`, `fetchUsers`, `createUser`, `updateUser`, `deleteUser`, etc.).
- **`UsersFilters`** — local type narrowing `SearchUsersRequest` to the fields the UI exposes. `id` is a single string (wrapped into the API's array at the `search:` call site); `sort` is a CSV string parsed by `sortTokensOf`.
- **`UpdateUserData`** — the JSON PATCH body plus an optional `imageUpload: Blob`. Deliberately not the generated multipart request type, which lacks `imageUrl`.
- **`create` binding** — branches on `imageUpload`: multipart when present, plain JSON otherwise.
- **`update` binding** — same branch; when both an upload *and* field-clears (`null` values) are present, `uploadThenClear` issues the multipart write first, then a follow-up JSON PATCH for the clears (a multipart part cannot carry `null`).
- **`optimisticPatch`** — maps the request shape onto the local `User` for optimistic UI. Strips `imageUpload` (Blob never in state), maps `role: null → undefined` (no staff role = absent field), and drops other `null` values so the optimistic guess is left untouched until the real response lands.
- **`hardDeleteUser(userId)`** — irreversible delete via `hardDeleteUserById`; routes through `deleteTarget` so the cache entry is removed. Distinct from soft `deleteUser` so the wrong action cannot be triggered by a boolean flag.
- **`restoreUser(userId)`** — undoes a soft delete via `POST /users/{id}/restore`; writes the restored record back into the cache via `addUser`.

## Relationships

- **`views/UsersList.vue`** — consumes `usersList`, `fetchUsers`, `filters`, pagination state, and `watchSearchUsers` to render the paginated/searchable list.
- **`views/User.vue`** — reads `currentUser` / `selectedUserId` and `watchUser` for the detail page.
- **`views/UserCreate.vue`** — calls `createUser` (the store's `createOne`); the `imageUpload` field on the form triggers the multipart branch.
- **`views/UserEdit.vue`** — calls `updateUser` (the store's `updateOne`); sends a partial PATCH payload. Also the caller that motivates the PATCH-not-PUT comment.
- **`tests/store.spec.ts`** — unit-tests the store's actions and state.
- **`tests/user-create-view.spec.ts` / `user-view.spec.ts` / `users-list-view.spec.ts`** — view-level tests that exercise the store through their components.
- **`@guebbit/vue-toolkit` → `useStructureCrudApi`** — provides all generated CRUD/pagination/fetch logic; this file supplies the endpoint callbacks and type parameters.
- **`@/infrastructure/utils/forms.ts`** — `omitNulls` (used in `optimisticPatch`) and `uploadThenClear` (the multipart-then-PATCH sequence in `update`).
- **`@/infrastructure/utils/sort.ts`** — `sortTokensOf` converts the CSV `sort` filter into the typed `UserSortItem[]` the API expects.
- **`@/infrastructure/query-client.ts`** — the shared `queryClient` passed as the cache backend to `useStructureCrudApi`.

## Notes

- **PATCH, not PUT.** The `update` binding is a `PATCH` on purpose: `UserEdit.vue` submits only the fields its form holds. A `PUT` would clear every omitted field (e.g. `role`, `active`) per RFC 9110 §9.3.4.
- **Multipart cannot clear a field.** A multipart body has no way to express `"imageUrl": null`, so a save that both uploads and clears is split into two sequential requests via `uploadThenClear`. The generated `CreateUserRequestMultipart` / multipart update types therefore never carry `imageUrl`.
- **`id` filter shape mismatch.** The UI filter box holds a single `id` string; the API expects an array. The wrapping (`filters.id ? [filters.id] : undefined`) happens inside the `search:` callback, so the local type keeps `id?: string`.
- **Optimistic-patch `null` semantics.** `null` on `locale`/`phone`/`website`/`imageUrl` in the request means "clear this field"; in `optimisticPatch` those `null`s are *dropped* (not applied) because the real clear only becomes visible once the server response updates the cache. `role: null` is the exception — it maps to `undefined` because "no staff role" is represented as an absent `role` on the local `User` type.
- **Soft vs. hard delete are separate actions** (`deleteUser` vs. `hardDeleteUser`), not a flag, to prevent accidental irreversible deletion.
- **`restoreUser` is idempotent-safe** (POST, not DELETE); calling `deleteUser` again after a restore re-soft-deletes rather than erroring.
