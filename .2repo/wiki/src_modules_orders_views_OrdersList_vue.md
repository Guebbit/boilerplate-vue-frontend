# src/modules/orders/views/OrdersList.vue

## Purpose
The user-facing orders list and search page. It binds a filter form and a paginated `DataTable` to the orders Pinia store, and exposes per-row actions (view, edit, delete, hard-delete) gated by the signed-in user's admin role.

## Key elements
- **`handleSearch` / `handleReset`** – Apply or clear the reactive `filters` object and re-trigger the store's `search` composable, resetting to page 1.
- **`pageItems` (computed)** – Filters the toolkit's sparse `pageItemList` (which contains `undefined` holes) down to real `Order` objects before handing them to the table.
- **`tableHeaders` (computed)** – Builds localized `CoreDataTableHeader<Order>[]`; re-evaluates on locale change because it calls `t()`.
- **`STATUS_COLORS`** – A `satisfies Record<OrderStatus, string>` map guaranteeing every status has a color; missing entries fail at compile time.
- **`statusColor(status?)`** – Resolves a status to a Vuetify color name, defaulting to `'secondary'` when unset.
- **`handleDelete` / `handleHardDelete`** – `confirm()`-guarded calls to the store's `deleteOrder` / `hardDeleteOrder`; success and error are surfaced as toasts via `addMessage` / `notifyErrorMessages`.
- **`pageSizeOptions`** – Static `[10, 25, 50]` choices bound to the page-size `<v-select>`.

## Relationships
No direct import or call of `src/infrastructure/utils/logger.ts` is present in this file. The only cross-module utility interaction visible here is `notifyErrorMessages` (from `@/infrastructure/utils/errors.ts`) used to surface API errors as toasts.

## Notes
- **Sparse array gotcha:** `pageItemList` comes from the `@guebbit/vue-toolkit` pagination helper and is a *sparse* array — indices may be `undefined` at runtime despite the element type. The `pageItems` computed (with its `eslint-disable` comment) exists solely to strip those holes. Forgetting this filter will cause `DataTable` to render empty rows.
- **Two delete paths:** `handleDelete` is a soft-delete; `handleHardDelete` is irreversible. Both are admin-only and both use `@click.stop` to prevent the `DataTable` row-selection handler from firing.
- **`watchSearchOrders`** is a store action (not a Vue `watch`) that returns `{ search }`; it reads the same reactive `filters`/`pageSize` refs so the form and the request stay in sync without explicit watchers.
- **Exhaustive status mapping:** Because `STATUS_COLORS` uses `satisfies Record<OrderStatus, string>`, adding a new `OrderStatus` union member in `@types` without updating this map is a compile error.
