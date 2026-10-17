---
source: src/modules/users/views/UsersList.vue
sha256: 28e1881c8b4836589b6b97fa6d55b907f934eb573d1fa1116894fd6aa0ab07e0
generated_at: 2026-10-17T01:50:13.005665+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/views/UsersList.vue

## Purpose

The users list/search page. Wires the users store's paginated search to a filter form (text, id, email, username, active, deleted) and a `DataTable`, and exposes per-row actions: manage access (role/active change), soft delete, restore, and hard delete. State lives in the Pinia store; this component is the view and interaction layer.

## Key elements

- **`tableHeaders`** – computed `CoreDataTableHeader<User>[]`; the `image` and `actions` columns are `synthetic` (rendered via slots, not sorted by value).
- **`handleDelete(userId, username)`** – soft-delete behind a confirm dialog; reloads the list afterwards because the store's optimistic `deleteOne` drops the row locally.
- **`handleRestore(userId)`** – undo a soft delete; no confirmation; reloads the list.
- **`handleManageAccess(item)`** – opens `UserAccessDialog`; on confirm sends only the changed fields via `updateUser`.
- **`handleHardDelete(userId, username)`** – permanent delete behind a confirm dialog; no reload needed.
- **`activeChoice` / `deletedChoice`** – `useAnyFilterChoice` models mapping the store's `null`/absent filter to the "All" select option.
- **`syncUrl`** – `useListUrlState` keeps filters, page, and page-size in the query string for deep links and reloads.
- **`sortBy`** – `useServerSort` bound to `filters.sort`; only columns matching the `UserSortItem` enum are sortable.
- **`rowActionError` / `reportRowActionError` / `clearRowActionError`** – single `useBlockingError` instance shared by all row write actions; rendered as an `InlineErrorAlert` above the table.
- **`search`** – store's `watchSearchUsers` action; failures toast via `notifyErrorMessages`.

## Relationships

- **`../store.ts`** – primary data source. Consumes actions (`watchSearchUsers`, `updateUser`, `deleteUser`, `hardDeleteUser`, `restoreUser`) and reactive state (`filters`, `pageItemList`, `selectedUserId`, `pageCurrent`, `pageSize`, `pageTotal`, `loading`) via `storeToRefs`.
- **`../composables/use-user-access-dialog.ts`** – provides the dialog's open/target/options state and the promise-returning `request()` that `handleManageAccess` awaits before calling `updateUser`.
- **`../components/UserAccessDialog.vue`** – rendered in the template; its visibility and content are driven by the composable above.
- **`tests/users-list-view.spec.ts`** – the unit/integration test suite for this view.

## Notes

- The "active" filter's "All" option uses `value: null`, **not** `undefined`. Vuetify treats an `undefined` item value as "render the title," which would post the translated label into the filter instead of sending no filter at all.
- Row-action visibility is gated per-row by `item.actions` (server-provided permissions for *this* admin on *this* account). The session store is only consulted for the "Create user" button's `create:User` key.
- `handleDelete` and `handleHardDelete` share one `useBlockingError` instance (both are confirm-dialog write actions). Search failures are handled separately as ambient toasts—see `docs/theory/request-flow.md`.
- The file uses two `<script>` blocks: a plain block to set `name: 'UsersListPage'` (needed for `<KeepAlive>`/devtools) and a `<script setup>` block for logic.
- The template section is truncated in the source snapshot shown here.
