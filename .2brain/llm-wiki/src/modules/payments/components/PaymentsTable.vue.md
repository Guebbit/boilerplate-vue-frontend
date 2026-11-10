---
source: src/modules/payments/components/PaymentsTable.vue
sha256: 543e98c37fac0a0e863f943b798000a12dc0bdbbb4a8058234bbd3a386b02de1
signature: 035b47ab8b4a409683bc0d075b179fa27959e232fe86e649fc31320840e8c4b8
generated_at: 2026-11-10T05:09:37.881100+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/PaymentsTable.vue

## Purpose

Renders the "All payments" tab: a filterable, sortable, server-paginated table of payments. Filters are intentionally local component state (not store state) so a second payment list on the same screen (e.g. the refunds tab) can maintain its own query independently. Emits `select` to let the parent open a payment drawer.

## Key elements

- **`emit('select', payment)`** — fired via `useRowSelect` when a row is clicked; parent is expected to open the detail drawer.
- **`filters` (ref, `PaymentFilters`)** — the full filter form (status, method, provider, date ranges, amount bounds, order ID, reference, disputed flag, sort). Persisted to the URL under the `payments-` prefix.
- **`usePagedTable`** — drives page/pageSize and calls `store.fetchPaymentsPage` with all converted filter values.
- **`useListUrlState`** — syncs `filters` + `page` to the query string (prefix `payments`) so state survives navigation and coexists with the refunds tab.
- **`useListSearch`** — `handleSearch` (apply filters, reset to page 1) and `handleReset` (clear filters, reload).
- **`useServerSort`** — binds header sort clicks to `filters.sort` and triggers `handleSearch`.
- **`useAnyFilterChoice`** — maps Vuetify's `null` model for "Any" ↔ `undefined` in the filters object for both `displayStatus` and `method` selects.
- **`useRowSelect`** — tracks the clicked row and emits `select`.
- **`useOrderLink`** — returns an optional link helper for the order column; yields nothing when the `orders` module is not shipped.
- **`headers` (computed)** — eight `CoreDataTableHeader<Payment>` entries; `displayStatus`, `method`, `provider`, `orderNumber`, `email`, and `amountRefunded` are marked `synthetic: true` (rendered by slot, not a flat field).

## Relationships

- **`src/modules/payments/store.ts`** — source of `paymentsPage`, `paymentsTotal`, `loading`, and the `fetchPaymentsPage` action that issues `POST /payments/search`.
- **`src/modules/payments/composables/use-paged-table.ts`** — encapsulates page state and the fetch callback; this component passes `paymentsTotal` and the API call.
- **`src/modules/payments/composables/use-row-select.ts`** — receives `paymentsPage` and the click handler; manages highlight/selection state.
- **`src/modules/payments/components/PaymentStatusChip.vue`** — rendered inside the `displayStatus` synthetic column via scoped slot.
- **`src/modules/payments/views/PaymentsList.vue`** (parent) — embeds this table, listens for `select` to open the payment drawer, and owns tab switching.
- **`src/modules/payments/tests/payments-tables.spec.ts`** — unit/e2e tests exercising filter application, pagination, sorting, and row-click behavior.

## Notes

- **Amounts are strings in `filters`.** `boundOf` converts them to the API's decimal representation at call time; an empty box means "no bound", not zero.
- **Date fields** are converted via `startOfDayInstant` / `endOfDayInstant` before hitting the API so the server receives full-instant boundaries.
- **`null` vs `undefined` for enum selects.** `useAnyFilterChoice` translates Vuetify's `null` model to `undefined` in the filters object, which the API interprets as "no filter". Do not bypass this helper when adding new enum filters.
- **URL prefix is `payments-`** (not `payments-list-`), specifically so the refunds tab can use its own prefix in the same query string without collision.
- **Sort tokens** are derived from `filters.sort` via `sortTokensOf(…, PaymentSortItem)`; the key set is constrained to the `PaymentSortItem` enum — arbitrary column keys are not sortable.
- **`novalidate` on the form** — client-side validation is handled by the server; the browser should not block submit.
