---
source: src/modules/payments/components/RefundsTable.vue
sha256: 274b8ce29ca86540c9dfcf0674aa4758bc24c93a871143d417af4099d7c5d9e5
signature: 01e549393ec11bb58e0f7b8914bfbf02919c605e0e01639d1f279272d886546d
generated_at: 2026-11-10T05:10:17.849705+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/RefundsTable.vue

## Purpose

The "Refunds" tab of the payments list. Renders a read-only, paginated table of every refund (across all payments) with status, reason, amount, and provider reference. Supports filtering by status, reason, order ID, and creation date range. Refunds are never mutated here—settlement lives on the parent payment.

## Key elements

- **Named component block** (`export default { name: 'RefundsTable' }`) — separate `<script>` block required because `<script setup>` cannot set a component name (needed for `<KeepAlive>` / devtools).
- **`RefundFilters`** — local interface describing the editable filter shape (`status`, `reason`, `orderId`, `createdFrom`, `createdTo`).
- **`usePagedTable`** — supplies `page`, `pageTotal`, and `load`; delegates the actual fetch to `store.fetchRefundsPage`, normalising date bounds via `startOfDayInstant` / `endOfDayInstant` and trimming `orderId`.
- **`useListUrlState`** (prefix `refunds`) — keeps filters + page in the URL query string so state survives navigation.
- **`useListSearch`** — wires `handleSearch` (apply from page 1) and `handleReset` (clear all, reload), calling `syncUrl` on apply.
- **`statusOptions` / `reasonOptions`** — computed arrays for the Vuetify `<v-select>`s, each leading with an "any" (`null`) entry.
- **`statusChoice` / `reasonChoice`** — `useAnyFilterChoice` bridges so the select's `null`/value model maps onto the `filters` ref.
- **`headers`** — computed `CoreDataTableHeader<RefundListItem>[]` defining the seven visible columns.
- **`orderLink`** (`useOrderLink`) — returns a route or `null`; the template renders a `<router-link>` only when a route exists.
- **`STATUS_COLORS`** — `satisfies Record<TRefundStatus, ThemeColor>` mapping to Vuetify semantic colours; the `satisfies` keyword enforces exhaustiveness at compile time.

## Relationships

- **`use-paged-table.ts`** — consumed for `page`, `pageTotal`, and the `load` callback that the search/reset handlers and `<ListPagination>` drive.
- **`store.ts` (`usePaymentsStore`)** — source of `refundsPage`, `refundsTotal`, `loading`, and the `fetchRefundsPage` action called inside the `usePagedTable` loader.
- **`PaymentsList.vue`** — parent view that mounts this component as a tab; both tabs share the same query-string namespace, which is why this table uses the `refunds-` URL prefix to avoid clobbering the payments tab's params.
- **`payments-tables.spec.ts`** — integration/unit tests that exercise this component's filtering, rendering, and empty-state behaviour.

## Notes

- **Dual script blocks are intentional.** The non-`setup` block exists solely to attach a stable `name`; removing it breaks `<KeepAlive>` and devtools identification.
- **URL-prefix collision.** The `refunds-` prefix on every query param is a hard requirement—dropping it would overwrite the payments tab's state in the same `?` string.
- **`failureReason` is staff-only data.** The server exposes a closed enum value; the raw provider error text never leaves the server logs. The template translates the enum key and shows it as a secondary line under the status chip.
- **`orderId` filter** is trimmed before the API call (`filters.value.orderId?.trim() || undefined`) to prevent whitespace-only values.
- **Date fields** are sent as full-instant boundaries (`startOfDayInstant` / `endOfDayInstant`), not raw `YYYY-MM-DD` strings, so the server receives unambiguous UTC instants.
- **`orderLink` is optional.** If the build ships without the `orders` module, `orderLink(orderId)` returns `null` and the cell degrades to a plain `<span>`.
- **`EMPTY_VALUE`** (from `@/infrastructure/utils/formatters.ts`) is rendered in place of a missing `providerRefundRef` rather than leaving the cell blank.
