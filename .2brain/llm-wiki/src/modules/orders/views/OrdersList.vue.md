---
source: src/modules/orders/views/OrdersList.vue
sha256: e961a38dec849cc76e2b1d908fcdff73aa84ab2520123a8d98f99543e9ff4d51
signature: e961a38dec849cc76e2b1d908fcdff73aa84ab2520123a8d98f99543e9ff4d51
generated_at: 2026-11-10T05:06:41.603151+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/views/OrdersList.vue

## Purpose

Dual-scope orders list page. Rendered as `mine` (the signed-in account's own orders) or `all` (staff view of every order at `/sales/orders`), it wires the orders Pinia store's paginated search to a filter form, a sortable `DataTable`, per-row role-gated actions (view / edit / delete / hard-delete), and a CSV export. The RF-reference lookup is delegated to `payments`' `OrderReferenceSearch` rather than reimplemented locally.

## Key elements

- **`props.scope`** (`'mine' | 'all'`, default `'mine'`) — switches between account and staff views; controls visibility of search boxes, date ranges, transfer queue, and the `userId` filter.
- **`pinOwner()`** — sets `filters.userId` to the viewer's id on `mine`; on `all`, clears a leftover `userId` unless the URL explicitly requested one. Called once before the first search.
- **`tableHeaders`** — computed array of `CoreDataTableHeader<Order>[]` with two `synthetic: true` columns (`payment`, `actions`) whose cells are rendered via slots rather than a data field.
- **`STATUS_COLORS`** — `satisfies Record<OrderStatus, ThemeColor>` mapping; a new enum member will fail compilation until a color is added.
- **Status/fulfillment/payment/return select options** — each built via `useAnyFilterChoice` with a `null` "any" value (not `undefined`, which Vuetify would treat as "use the label").
- **`handleReferenceFound(orderId)`** — the `@found` handler for `OrderReferenceSearch`; navigates to `OrderEdit` because that component does not declare a route itself.
- **`useListUrlState`** — syncs `filters`, `pageCurrent`, `pageSize`, and sort into URL query params so deep links and reloads preserve the view. The `userId` param is only included when `isStaff`.
- **`useTouchFriendlySize`** — switches row-action button size between `small` (desktop) and Vuetify's default (below `sm` breakpoint) for WCAG touch targets.
- **Named export block** — `name: 'OrdersListPage'` in a separate `<script>` block so `<KeepAlive>` and devtools can identify the component (not possible inside `<script setup>`).

## Relationships

- **`src/modules/orders/store.ts`** — primary data source. `useOrdersStore` supplies `watchSearchOrders`, `deleteOrder`, `hardDeleteOrder`, `restoreOrder`, `exportOrdersCsv`, and all reactive state (`filters`, `ordersList`, `pageCurrent`, `pageTotal`, `pageSize`, `loading`, `selectedOrderId`).
- **`src/modules/orders/domain/index.ts`** — barrel re-export of `exportRefusalOf` (from `export-refusal.ts`), used here to display refusal reasons on applicable rows.
- **`src/modules/orders/domain/export-refusal.ts`** — provides `exportRefusalOf`, the pure function that derives a human-readable refusal message for an order's export state.
- **`src/modules/payments/components/OrderReferenceSearch.vue`** — imported and mounted in the staff-scope filter area; emits `@found` with an `orderId` that this page converts into a router navigation.
- **`src/modules/orders/tests/orders-list-view.spec.ts`** — component/unit test file covering this view's rendering and interactions.

## Notes

- The component is used by **two** routes (`OrdersList` → `mine`, `SalesOrders` → `all`). The `scope` prop is the only differentiator; all template logic branches off `isStaff`.
- `pinOwner()` runs **synchronously** at setup, before the first `search()` call. If you add a new filter that depends on `userId`, ensure it runs after `pinOwner()`.
- The "any" filter option uses `value: null` deliberately. Using `undefined` causes Vuetify's select to post the translated label string to the API instead of omitting the filter.
- `STATUS_COLORS` uses TypeScript `satisfies` (not `as`) so the object literal is still checked for exhaustiveness against `Record<OrderStatus, ThemeColor>`.
- The RF-reference search component lives in the `payments` module but is mounted here because this page already owns the `OrderEdit` route target; moving it would require a route indirection that the payments module does not perform.
