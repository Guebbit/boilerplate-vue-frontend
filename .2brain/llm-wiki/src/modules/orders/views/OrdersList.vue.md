---
source: src/modules/orders/views/OrdersList.vue
sha256: c6452b197339ab7306cb092f7a158f2eaa086669e46a7db26ad9be0eb43b89cd
generated_at: 2026-10-17T01:20:42.029363+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/views/OrdersList.vue

## Purpose

A dual-scope Vue SFC that renders the paginated, filterable orders table. Scope `mine` (default) shows only the signed-in viewer's orders on the account page; scope `all` adds staff-only controls (search-by-id/user/product/email, date-range pickers, transfer queue, deleted filter) on the `/sales/orders` page. It wires the orders store's reactive filters and pagination into a `DataTable` with per-row view/edit/delete/hard-delete actions gated on role.

## Key elements

- **`props.scope`** (`'mine' | 'all'`, default `'mine'`) — determines which controls render and how the owner filter is pinned.
- **`pinOwner()`** — called once at setup; forces `filters.userId` to the viewer's id in `mine` scope, or clears a stale owner in `all` scope unless the URL explicitly asked for one.
- **`tableHeaders`** (computed) — localized column definitions for `DataTable`, including two synthetic columns (`payment`, `actions`) rendered via slots.
- **`STATUS_COLORS` / `statusColor()`** — maps every `OrderStatus` member to a Vuetify theme color; `satisfies Record<OrderStatus, string>` makes a missing status a compile error.
- **Filter selects** (`statusChoice`, `fulfillmentChoice`, `paymentStatusChoice`, `returnStatusChoice`, `deletedChoice`) — each pairs a `useAnyFilterChoice` composable with an options array whose "any" row uses `value: null` (not `undefined`) to avoid Vuetify treating the title as the model value.
- **`syncUrl`** — from `useListUrlState`; serializes filters, page, pageSize, and sort into route query params for deep-linking and reload persistence. Conditionally includes `userId` only in `all` scope.
- **`handleReferenceFound(order)`** — handler for `OrderReferenceSearch`'s `@found` event; navigates to `OrderEdit` by id.
- **Row actions** (view, edit, delete, hard-delete, restore, export CSV) — pulled from `useOrdersStore` and gated on `session` role and the domain helpers `canHardDelete` / `exportRefusalOf`.
- **Component name block** (`OrdersListPage`) — required alongside `<script setup>` so `<KeepAlive>` and devtools can identify the SFC.

## Relationships

- **`../store.ts` (`useOrdersStore`)** — source of all reactive state (`filters`, `ordersList`, `pageCurrent`, `pageSize`, `loading`, `selectedOrderId`) and actions (`watchSearchOrders`, `deleteOrder`, `hardDeleteOrder`, `restoreOrder`, `exportOrdersCsv`). The view is a thin presentation layer over this store.
- **`../domain/index.ts`** — barrel re-export consumed as `canHardDelete` and `exportRefusalOf`, used to gate the hard-delete row action and the CSV export button.
- **`../domain/hard-delete.ts`** — provides `canHardDelete`, which determines whether the hard-delete button is visible for a given row.
- **`../domain/export-refusal.ts`** — provides `exportRefusalOf`, which decides whether the CSV export is refused for the current selection.
- **`@/modules/payments` → `OrderReferenceSearch.vue`** — mounted as a child component in the staff filter area; its `@found` event is the sole trigger for `handleReferenceFound`.
- **`src/modules/orders/tests/orders-list-view.spec.ts`** — unit/integration spec for this SFC.

## Notes

- The "any" filter option uses `value: null` rather than `undefined` because Vuetify interprets an `undefined` item value as "use the label string as the model value," which would post the translated text as a filter parameter.
- `pinOwner()` runs **synchronously at setup**, before the first search fires. Reordering it after `watchSearchOrders` would cause a stale owner to leak into the initial request.
- The `mine` scope never exposes `userId` in the URL query (`useListUrlState` params are conditional on `isStaff`), so a customer's deep link cannot be forged to another account.
- `rowActionSize` switches from `small` to Vuetify's default below the `sm` breakpoint to meet WCAG touch-target sizing.
