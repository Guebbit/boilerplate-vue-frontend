---
source: src/modules/orders/views/OrdersList.vue
sha256: eca5790e61c7a936d18a1b116671b3a3d6514aba944e005bc0ef3bdfaccd5407
generated_at: 2026-10-02T15:26:11.520737+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/views/OrdersList.vue

## Purpose

The paginated order list page. It wires the orders Pinia store's server-side search, filter, sort, and pagination state to a `DataTable` with per-row actions (view, edit, soft-delete, hard-delete, restore), gated on the signed-in role. It also hosts the payments module's `OrderReferenceSearch` widget so an operator can jump to a specific order by reference without leaving the list.

## Key elements

- **`handleReferenceFound`** — receives the order from `OrderReferenceSearch`'s `@found` event and navigates to the `OrderEdit` route (the component itself names no route; this page owns the navigation).
- **`tableHeaders`** (computed) — localised column definitions for id, status, totalPrice, createdAt, and a synthetic `actions` column rendered via the table's slot.
- **`STATUS_COLORS`** — a `satisfies Record<OrderStatus, string>` map enforcing that every status gets an explicit Vuetify color; a new enum member fails compilation if unlisted.
- **`statusOptions` / `statusChoice`** — the status `<select>` model. The "any" row uses `null` (not `undefined`) so Vuetify posts an empty filter rather than the translated label (FA51).
- **`deletedChoice`** — same `useAnyFilterChoice` pattern for the soft-deleted toggle.
- **`awaitingTransferOnly`** — a single computed boolean that reads/writes two filter fields (`status === 'pending'` + `paymentMethod === 'bank_transfer'`) simultaneously.
- **`isStaff`** (computed) — `session.can('update', 'Order')`; hides id/user/product/email/transfer search fields from customers.
- **`rowActionSize`** — `useTouchFriendlySize()` returns `small` on desktop, Vuetify default below `sm` for WCAG tap-target compliance.
- **`handleDelete` / `handleHardDelete`** — both gate on `useDialogStore().confirm(…)` before calling the store action; failures are surfaced via the shared `useBlockingError` instance.
- **`handleRestore`** — no confirm dialog; restores then re-runs `search(true)` because the active filter may no longer match.
- **`syncUrl` / `useListSearch` / `useServerSort`** — keep filters, page, page-size, and sort in the URL so deep links and reloads restore the exact view.
- **`rowActionError`** (`useBlockingError`) — one shared blocking alert above the table for any failed write action (delete, hard-delete, restore).

## Relationships

- **`src/modules/payments/components/OrderReferenceSearch.vue`** — imported via `@/modules/payments` and rendered at the top of the page (staff/`create Payment` role only). The page supplies the `@found` handler; the component performs the lookup and emits the resolved `Order`.
- **`src/infrastructure/utils/logger.ts`** — appears in the dependency graph but no direct import is visible in this file; likely reached transitively through `notifyErrorMessages` or another utility.

## Notes

- The "any" filter row intentionally uses `value: null`, not `undefined`. Vuetify's `v-select` treats an `undefined` item value as "use the label text as the model value," which would post the translated string into the filter (FA51).
- `awaitingTransferOnly` writes `undefined` (not `null`) when clearing both underlying filters — the store serialises `undefined` as "no filter" while `null` could be ambiguous in the query string.
- Row-action errors and search errors are deliberately separated: search failures toast (ambient, table still shows stale data) while write-action failures block the table via `InlineErrorAlert`. Rationale lives in `docs/theory/request-flow.md`.
- `handleRestore` deliberately omits a confirm dialog: the action is non-destructive and one delete away, so friction is unnecessary.
- The component's `name` option (`OrdersListPage`) is declared in a separate non-setup `<script>` block so it is available to `<keep-alive>` / devtools without a runtime export.
