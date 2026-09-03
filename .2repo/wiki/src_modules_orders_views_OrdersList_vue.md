# src/modules/orders/views/OrdersList.vue

## Purpose

Renders the user-facing orders list page: a filter form (id, user, product, email), a paginated `DataTable` of orders, and per-row actions (view, edit, delete, hard-delete). It wires the Pinia orders store's reactive search/pagination state to the UI without holding any local list data.

## Key elements

- **`tableHeaders`** — `computed` that returns localized `CoreDataTableHeader<Order>[]`; re-evaluates on locale change.
- **`pageItems`** — `computed` that filters the sparse `pageItemList` array (toolkit pagination produces `undefined` holes) down to actual `Order` objects.
- **`search`** — destructured from `watchSearchOrders`; bound to the store's `filters`/pagination; errors routed to a toast via `notifyErrorMessages`.
- **`handleSearch` / `handleReset`** — reset `pageCurrent` to 1, then invoke `search()` (reset also clears `filters`).
- **`handleDelete` / `handleHardDelete`** — `confirm()`-gated calls to the store's `deleteOrder` / `hardDeleteOrder`; success/failure reported as toasts.
- **`STATUS_COLORS`** — `satisfies Record<OrderStatus, string>` map from status to Vuetify color; the `satisfies` constraint makes adding a new `OrderStatus` member a compile error until a color is provided.
- **`statusColor`** — looks up a status in `STATUS_COLORS`, defaulting to `'secondary'` when undefined.
- **`rowActionSize`** — from `useTouchFriendlySize()`; yields `'small'` on desktop, Vuetify default on mobile to meet WCAG tap-target size.
- **`isAdmin`** — from `useSessionStore`; gates the edit / delete / hard-delete buttons.

## Relationships

The listed graph neighbor `src/infrastructure/utils/logger.ts` is **not imported** by this file; no direct interaction exists in the current source. (Error reporting goes through `@/infrastructure/utils/errors.ts` → `notifyErrorMessages`.)

## Notes

- **Sparse pagination array**: `pageItemList` is a sparse array from `@guebbit/vue-toolkit`; `pageItems` filters out `undefined` holes. An `eslint-disable` suppresses the "unnecessary condition" warning because the TS element type claims non-undefined.
- **`satisfies` on `STATUS_COLORS`**: unlike `as`, this preserves the literal object type while still enforcing exhaustiveness over `OrderStatus`. Forgetting a new status is a type error, not a silent grey chip.
- **`confirm()` for destructive actions**: uses the native browser dialog rather than a Vuetify dialog; the i18n key differs between soft and hard delete.
- **`<script>` (non-setup) block** only carries the component `name: 'OrdersListPage'` (required for keep-alive / devtools identification). All logic lives in `<script setup>`.
- **Row actions use `@click.stop`** to prevent the `DataTable`'s row-selection handler from firing on delete/hard-delete.
