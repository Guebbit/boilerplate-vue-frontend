---
source: src/modules/users/views/UsersList.vue
sha256: 43086771c1d75a374237e14871e741366aff4d2cdc049095afa935fc30d9689c
generated_at: 2026-10-02T15:54:04.308841+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/views/UsersList.vue

## Purpose

The primary list/search page for the Users module. It wires the Pinia users store's paginated search to a filter form, a `DataTable`, and per-row actions (view, edit, soft-delete, hard-delete, restore, manage access). It keeps filters, page, and sort state in the URL so the view is deep-linkable and survives reload.

## Key elements

- **`tableHeaders`** – Computed array of `CoreDataTableHeader<User>`; defines the visible columns. `image` and `actions` are marked `synthetic` (rendered via slots, not sortable data).
- **`activeOptions` / `deletedOptions`** – Localized select-option arrays. The "all" row uses `value: null` (not `undefined`) to avoid Vuetify posting the translated label as the filter value.
- **`activeChoice` / `deletedChoice`** – Wrappers from `useAnyFilterChoice` that map the `null` "all" screen value to an absent key on `filters`.
- **`handleDelete` / `handleHardDelete`** – Prompt a confirmation dialog (`useDialogStore().confirm`), then call `deleteUser` / `hardDeleteUser` on the store. Soft-delete reloads the list so the row reappears under the "Deleted" filter; hard-delete is irreversible.
- **`handleRestore`** – Calls `restoreUser` without a confirmation, then reloads.
- **`handleManageAccess`** – Opens `UserAccessDialog` via `useUserAccessDialog`; on confirm, PATCHes only the changed fields through `updateUser`.
- **`sortableKeys`** – Derived from the `UserSortItem` enum via `sortFieldsOf`; only server-orderable columns show a sort affordance.
- **`syncUrl`** – `useListUrlState` binding that serialises `filters`, `page`, and `pageSize` into query params (`text`, `id`, `email`, `username`, `active`, `deleted`, `sort`).
- **`rowActionError` / `reportRowActionError`** – `useBlockingError` instance shared by all destructive row actions; renders an `InlineErrorAlert` above the table on failure.

## Relationships

- **`@/modules/users/store`** – Consumes `useUsersStore` actions (`watchSearchUsers`, `updateUser`, `deleteUser`, `hardDeleteUser`, `restoreUser`) and reactive refs (`filters`, `pageItemList`, `pageCurrent`, `pageSize`, `pageTotal`, `loading`, `selectedUserId`).
- **`@/ui/organisms/DataTable.vue`** – Renders the user rows; receives `tableHeaders`, `sortBy`, and slot content for the `image` and `actions` columns.
- **`@/modules/users/components/UserAccessDialog.vue`** – Opened imperatively via `useUserAccessDialog`; its `request()` promise gates the `updateUser` call.
- **`@/infrastructure/utils/errors.ts`** (`notifyErrorMessages`) – Toasts search-request failures.
- **`@/infrastructure/utils/use-blocking-error.ts`** – Provides the blocking-error state for row actions.
- **`src/infrastructure/utils/logger.ts`** and **`src/modules/payments/components/OrderReferenceSearch.vue`** are listed as graph neighbors but no direct import or call to either is visible in this file.

## Notes

- **`null` vs `undefined` in filter options (FA51):** Vuetify treats an `undefined` item value as "use the title string," which would POST the translated label instead of clearing the filter. Always use `null` for the "no filter" row.
- **Soft-delete reloads the list:** The store's optimistic update removes the row locally, but the page calls `search(true)` afterwards so the row reappears correctly under "All" or "Deleted only" filters.
- **Two error channels:** Search failures are ambient (toast via `notifyErrorMessages`); row-action failures are blocking (inline alert via `useBlockingError`). They are deliberately not merged.
- **Row-action button size:** `useTouchFriendlySize` switches between `small` (desktop) and Vuetify's default (mobile) to meet WCAG touch-target guidance.
- **`PATCH` discipline:** `handleManageAccess` sends only fields that changed; an unchanged `role` must never ride along in the same request (see `UserAccessDialog`'s own docs).
