# src/modules/users/views/UsersList.vue

## Purpose

Paginated user-list view that wires the Pinia `useUsersStore` search/filter state to a filter form, a `DataTable` with per-row actions (view, edit, soft-delete, hard-delete), and a pagination control. It is the main list page for the users module.

## Key elements

- **`activeOptions`** — `computed` that returns localized filter options for the "active" `<v-select>`; re-evaluates on locale change.
- **`pageSizeOptions`** — Static array of 10 / 25 / 50 choices bound to the store's `pageSize`.
- **`tableHeaders`** — `computed<CoreDataTableHeader<User>[]>` declaring the eight visible columns. `image` and `actions` are marked `synthetic: true` (no sortable field backing).
- **`pageItems`** — `computed` that filters out `undefined` holes from the toolkit's sparse `pageItemList` before handing rows to `DataTable`.
- **`search` / `handleSearch`** — `watchSearchUsers` hook returns a `search` callable; `handleSearch` resets `pageCurrent` to 1 then invokes it. Errors are surfaced via `notifyErrorMessages`.
- **`handleReset`** — Clears `filters` to `{}`, resets page to 1, and calls `search(true)`.
- **`handleDelete(userId)`** — Native `confirm()` gate → `deleteUser` → success/error toast.
- **`handleHardDelete(userId)`** — Native `confirm()` gate → `hardDeleteUser` → success/error toast. Irreversible.
- **Template slots** (`item.image`, `item.admin`, `item.active`, `item.createdAt`, `item.actions`) — Custom cell renderers inside `DataTable`.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Listed as a graph neighbor but **not directly imported or called** in this file. No visible interaction.

## Notes

- `pageItemList` is a **sparse array** at runtime (the toolkit's page window inserts `undefined` holes regardless of the element type). The `pageItems` computed strips them; the eslint-disable is intentional.
- Filter inputs (`filters.text`, `filters.id`, etc.) bind **directly** to the store's reactive `filters` ref — there is no local draft copy. Mutating the store's state from the template is by design here.
- `handleReset` passes `true` as the second argument to `search`; this likely signals "ignore cached results / force refetch" but the contract lives in the store, not this file.
- Delete / hard-delete use the browser's built-in `window.confirm()` rather than a Vuetify dialog.
- `item.id!` non-null assertion appears in the action handlers; the `User` type marks `id` as optional, but the view assumes a loaded row always has one.
- The `image` column header is `synthetic` even though `imageUrl` is a real field on `User`—the rationale (documented inline) is that a sortable URL column is meaningless.
