---
source: src/modules/users/views/UsersList.vue
sha256: c148d4e54629e7ba7939eeb7b718e7cc77e33f6c23c7009dc295fc99a3daf2b4
signature: c148d4e54629e7ba7939eeb7b718e7cc77e33f6c23c7009dc295fc99a3daf2b4
generated_at: 2026-11-10T06:11:35.079082+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/views/UsersList.vue

## Purpose

Admin-facing users list and search page. It binds the users store's paginated search to a filter form and a `DataTable`, and exposes per-row actions (view, edit, delete, hard-delete, restore) plus a role/permission change dialog. It is the single view an admin lands on to browse and manage accounts.

## Key elements

- **`export default { name: 'UsersListPage' }`** — stable component name for `<KeepAlive>` / devtools (required because `<script setup>` cannot declare its own `name`).
- **Filter models** (`activeChoice`, `holdChoice`, `reviewChoice`, `deletedChoice`) — each wraps a store filter field via `useAnyFilterChoice`; the "all" option maps UI `null` → no filter key, while boolean-only filters (`purchaseHold`, `purchaseHoldReview`) map `null` → `undefined`.
- **`tableHeaders`** — computed `CoreDataTableHeader<User>[]`; `image` and `actions` are marked `synthetic` (non-sortable, non-field-bound).
- **`syncUrl`** (`useListUrlState`) — serialises filters, page, and page size into the URL for deep-linking and reload persistence.
- **`handleSearch` / `handleReset`** (`useListSearch`) — apply or clear filters, reset to page 1, and sync the URL.
- **`sortBy`** (`useServerSort`) — header sort state stored in `filters.sort`; sortable keys derived from the `UserSortItem` enum.
- **`rowActionError`** (`useBlockingError`) — shared blocking-error state for destructive row actions (delete / hard-delete / restore); a failed request surfaces an inline alert above the table rather than a toast.
- **`handleDelete`** — confirm → `deleteUser` → reload list (`search(true)`) so the "All / Deleted" filter reflects server truth.
- **`confirmScheduledRestore`** — extra warning dialog when restoring an account whose *owner* requested deletion (`purgeAt` set).
- **`useUserAccessDialog`** — drives the `UserAccessDialog` open/target/options and the promise-returning `request()` used by the row action.

## Relationships

- **`src/modules/users/store.ts`** — source of all reactive state (`filters`, `pageItemList`, `loading`, pagination counters) and server actions (`watchSearchUsers`, `applyAccessChange`, `deleteUser`, `hardDeleteUser`, `restoreUser`).
- **`src/modules/users/composables/use-user-access-dialog.ts`** — encapsulates dialog open/close, target selection, and the async `request()` the row action awaits.
- **`src/modules/users/components/UserAccessDialog.vue`** — rendered when `accessDialogOpen` is true; receives `target` and `options` from the composable.
- **`src/modules/users/tests/users-list-view.spec.ts`** — unit/E2E spec covering this view's rendering and interactions.

## Notes

- The "all" filter row must use `null`, not `undefined`, as its select value — Vuetify treats an `undefined` item value as "display the title text" and would POST the translated label to the API.
- `purchaseHold` and `purchaseHoldReview` accept only `true` from the API; the "any" row clears them to `undefined` (not `false`).
- Row-action visibility is governed by the server-provided `item.actions` array (per-admin, per-account permissions), **not** the session store. The session store is consulted only for the page-level "Create user" button (`create:User` permission).
- The `image` column is `synthetic` even though `imageUrl` exists on the model: a sortable URL column serves no purpose.
- Soft-delete and hard-delete share one `useBlockingError` instance; a search failure is ambient (table simply hasn't refreshed) and reports via toast instead.
- After a soft delete the list is re-fetched because the store's optimistic update removes the row, but the active "All / Deleted" filter should still display it with a `RowDeletedChip` badge.
