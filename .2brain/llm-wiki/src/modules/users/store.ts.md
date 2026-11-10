---
source: src/modules/users/store.ts
sha256: 3641cae966977123aa4d09ff613f0ec657724130422ebcc7d5ec79d0a7839266
signature: ce32af58bf18f855fbf384779f3d6e199d026615f93c7eb412f1aec27be7408a
generated_at: 2026-11-10T06:05:08.152685+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/store.ts

## Purpose

Pinia store providing all user-domain state and actions: CRUD with avatar upload, paginated search, soft/permanent delete, account activation, role assignment/revocation, and purchase-hold management. It is built on the shared `useStructureCrudApi` primitive so its shape mirrors the products store, differing only in endpoints and filter fields.

## Key elements

- **`useUsersStore`** — the single exported store (`defineStore('users', …)`).
- **Toolkit-generated members** (from `useStructureCrudApi`): `users` (record map), `usersList`, `addUser`, `selectedUserId`, `currentUser`, `filters`, `loading`, `pageCurrent`/`pageSize`/`pageTotal`/`pageItemList`, and the actions `fetchUsers`, `fetchPaginationUsers`, `watchSearchUsers`, `fetchUser`, `watchUser`, `createUser`, `updateUser`, `deleteUser`, `deleteTarget`, `fetchAny`.
- **`hardDeleteUser(userId)`** — irreversible permanent delete (distinct from the soft `deleteUser`).
- **`restoreUser(userId)`** — undoes a soft delete via `POST …/restore`.
- **`activateUser` / `deactivateUser`** — toggle account sign-in status.
- **`assignRole(userId, role)` / `revokeRole(userId)`** — grant or remove the single staff role.
- **`applyAccessChange(userId, change)`** — orchestrates a confirmed role and/or status change from the access dialog; calls only the actions whose fields are present in `change`.
- **`setPurchaseHold` / `liftPurchaseHold`** — place or clear a checkout hold.
- **`UsersFilters`** type — local filter shape; `id` is a single string (wrapped to an array for the API) and `sort` is a CSV string (parsed via `sortTokensOf`).
- **`UpdateUserData`** type — `UpdateUserByIdRequest & { imageUpload?: Blob }`; carries the optional upload alongside the JSON PATCH body.

## Relationships

- **`UserCreate.vue`** — calls `createUser`; the multipart branch handles the avatar upload.
- **`UserEdit.vue`** — calls `updateUser` (PATCH); the `uploadThenClear` path fires when a new image is attached while other fields are cleared.
- **`UserTarget.vue`** — uses `selectedUserId`/`currentUser` and the hand-written actions (activate, deactivate, assign/revoke role, purchase hold, hard-delete, restore).
- **`UsersList.vue`** — binds `filters`, pagination state, and `fetchUsers`/`fetchPaginationUsers`/`watchSearchUsers`.
- **`store.spec.ts`** — unit-tests the store's actions and state transitions.
- **`user-create-view.spec.ts` / `user-view.spec.ts` / `users-list-view.spec.ts`** — component-level tests that exercise the store through their respective views.

## Notes

- **Multipart + clear in one save:** `update` uses `uploadThenClear` when an upload is present, because a multipart part cannot carry `null`. The clears are sent as a follow-up JSON PATCH.
- **PATCH, not PUT:** the update verb is intentionally PATCH; a PUT would wipe any field the form doesn't hold (e.g. `locale`, `phone`).
- **`optimisticPatch`** strips the `Blob` and drops `null` fields so the local `User` type never sees `null` (the local type forbids it); the real clear is reflected only after the server response lands.
- **`id` filter** is a single string in `UsersFilters` but the API expects `string[]`; the `search` mapper wraps it.
- **`hardDeleteUser` vs `deleteUser`** are separate methods by design so the irreversible path can't be triggered by passing a wrong flag.
- **`applyAccessChange`** is the single entry point for the access dialog; it skips a sub-call when the corresponding field is `undefined` in `change`.
