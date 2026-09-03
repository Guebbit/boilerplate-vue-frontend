# src/modules/users/store.ts

## Purpose

Pinia store that provides CRUD, paginated search, and avatar-upload operations for the User entity. It is generated from the shared `useStructureCrudApi` toolkit primitive so that the store's shape stays identical to other resource stores (e.g. products), differing only in endpoints and filter fields. A single hand-written action handles irreversible hard-delete.

## Key elements

- **`useUsersStore`** – The store instance (`defineStore('users', …)`). Exposes:
  - `users` (record dictionary), `usersList`, `pageItemList` – cached / paginated data.
  - `selectedUserId`, `currentUser` – selection state.
  - `filters`, `loading`, `pageCurrent`, `pageSize`, `pageTotal` – search/pagination state.
  - `fetchUsers`, `fetchPaginationUsers`, `watchSearchUsers`, `fetchUser`, `watchUser` – read actions (list, paginated search, single fetch, reactive watchers).
  - `createUser`, `updateUser` – write actions that branch to a **multipart** variant when the request body carries an `imageUpload`; otherwise they use the plain JSON API.
  - `deleteUser` – soft delete (sets `deletedAt`, record remains visible to admins).
  - `hardDeleteUser(userId)` – irreversible delete; calls `hardDeleteUserById` through `deleteTarget`. Deliberately a separate method so the destructive path cannot be triggered by a wrong boolean flag.
- **`UsersFilters`** – `Omit<SearchUsersRequest, 'page' | 'pageSize'>`; the shape of filter criteria passed to `searchUsers`.
- **`optimisticPatch`** – strips `imageUpload` from the payload so no Blob is ever written into reactive store state; the API's `imageUrl` response is what gets cached.

## Relationships

*(No graph neighbors are listed for this file.)*

## Notes

- **`pageTotal` shadowing.** `useStructureCrudApi` returns a local `pageTotal` (counts only items already in memory). It is renamed `_localOnlyPageTotal` and shadowed by the `pageTotal` from `useServerPageTotal`, which is populated via `captureTotal(response.data.meta.totalPages)` inside the `search:` callback. Always read the shadowed value for server-paginated results.
- **Multipart branching is internal.** Consumers call `createUser` / `updateUser` with a single object shape (`{ imageUpload?, …userData }`); the store transparently dispatches to the `*WithMultipart` API variant when `imageUpload` is present. Callers never import the multipart endpoints directly.
- **Soft vs. hard delete are separate methods** (`deleteUser` vs. `hardDeleteUser`). There is no boolean flag; this is an intentional API-surface choice to make accidental data loss harder.
- The store is deliberately isomorphic to the products store. When changing one, expect to mirror the change in the other.
