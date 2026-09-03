# src/modules/users/views/UsersList.vue

## Purpose

The paginated user listing and search page. It wires the `useUsersStore` reactive filter/pagination state to a filter form, a `DataTable`, and per-row action buttons (view, edit, soft-delete, hard-delete), and reports API errors as toasts.

## Key elements

- **`handleSearch` / `handleReset`** – Reset `pageCurrent` to 1, then call the store's `watchSearchUsers` search action (`handleReset` also clears `filters` and passes `true` for a fresh fetch).
- **`handleDelete` / `handleHardDelete`** – Gate on `confirm()`, call the store's `deleteUser` / `hardDeleteUser`, and surface success/failure via `useNotificationsStore().addMessage` + `notifyErrorMessages`.
- **`tableHeaders` (computed)** – Localized `CoreDataTableHeader<User>[]`; the `image` and `actions` columns are marked `synthetic: true` (no sortable field).
- **`pageItems` (computed)** – Filters the store's sparse pagination array (`pageItemList`) to drop `undefined` holes, returning `User[]`.
- **`activeOptions` (computed)** – Re-localized select options for the active/inactive/any filter.
- **`rowActionSize`** – From `useTouchFriendlySize()`: `small` on desktop, default size below the `sm` breakpoint for WCAG-compliant tap targets.
- **`pageSizeOptions`** – Fixed 10 / 25 / 50 choices bound to the store's `pageSize` ref.

## Relationships

- **`src/infrastructure/utils/logger.ts`** – Indirect dependency: this file surfaces errors through `notifyErrorMessages` (imported from `@/infrastructure/utils/errors.ts`), which in turn routes messages through the shared logger. No direct import of `logger.ts` exists here.

## Notes

- `pageItemList` is a **sparse** array (runtime `undefined` holes) from the toolkit's pagination window. The `!!item` filter is required; the type annotation alone doesn't eliminate the holes, hence the `eslint-disable` comment.
- The `image` column is marked `synthetic` *despite* `imageUrl` existing on the model, to prevent the DataTable from offering a (meaningless) sort on raw URLs.
- All user-facing strings go through `t()`; `tableHeaders` and `activeOptions` are `computed` so they re-translate on locale switch.
- Delete/hard-delete buttons are `:disabled="loading"` to prevent double-submission during a fetch.
- The `v-btn` for "Create user" uses `:to="routerLinkI18n({ name: 'UserCreate' })"` rather than a hard-coded path, keeping navigation i18n-locale-aware.
