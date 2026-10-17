---
source: src/modules/payments/components/PaymentsTable.vue
sha256: 88982a3a1f225593d11275bd32ab8a08a1943390344b9f84a10cc10bf3b07df4
generated_at: 2026-10-17T01:22:12.547583+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/PaymentsTable.vue

## Purpose

The "All" tab of the payments list: renders every payment in a sortable, filterable, paginated table. All filtering and sorting happen server-side via `POST /payments/search`; the component owns its filter form state locally (deliberately *not* in the shared store) so a second payment list on the same screen can operate independently.

## Key elements

- **`filters` (ref\<PaymentFilters\>)** – Local reactive form state for all filter fields (status, method, provider, date ranges, amount bounds, order ID, reference, sort). Kept as strings so an empty box means "no bound" rather than 0.
- **`load()`** – Reads the current filter values, converts them (date → instant, amount string → number), and calls `store.fetchPaymentsPage`. Catches errors into a toast.
- **`handleSearch()` / `handleReset()`** – Reset page to 1, then trigger `load()`. Bound to the form submit and a reset button.
- **`useServerSort`** – Drives the column-header sort UI; writes the chosen field into `filters.sort` and re-applies from page 1.
- **`useAnyFilterChoice`** – Bridges Vuetify's `null`-valued "Any" option to the `undefined` used in the filter object for both `displayStatus` and `method`.
- **`amountOf()`** – Converts a raw text field to a non-negative number or `undefined` (empty/invalid → no bound).
- **`orderLink(orderId)`** – Returns a routed link to the order detail page *only if* the `orders` module is present in the build (`linkIfRouted` guard); otherwise returns `undefined` (no link rendered).
- **`selectedId` watcher** – Fire-and-forget row selection: sets `selectedId`, the watcher finds the row, emits `select`, then clears `selectedId` so the same row can be re-opened.
- **`headers` (computed)** – Column definitions for `DataTable`; most are marked `synthetic: true` because the cell content is rendered via scoped slots (status chip, formatted amounts, order link, etc.).

## Relationships

- **`../store.ts` (usePaymentsStore)** – Source of `paymentsPage`, `paymentsTotal`, `loading`; the single data-fetching entry point (`fetchPaymentsPage`).
- **`./PaymentStatusChip.vue`** – Imported and rendered in the table's status column slot to display a colored status badge.
- **`views/PaymentsList.vue`** – Parent view that mounts this component as the "All" tab and listens for the `select` event to open the payment drawer.
- **`tests/payments-tables.spec.ts`** – Unit/integration tests that exercise the filter form, pagination, and row-selection behavior of this component.
- **`contracts/rest/index.ts`** – Defines the `PaymentSortItem` enum and the shape of the `POST /payments/search` request that `load()` assembles.

## Notes

- Filter state is intentionally **local**, not store-backed. Do not move it into `usePaymentsStore` without understanding the multi-list-per-screen requirement.
- `selectedId` is a **transient** signal, not a persistent selection. A `watch` on it fires once, emits, then immediately resets to `undefined`. Do not use it as a "currently selected row" reference.
- `orderLink` returns `undefined` when the `orders` module is absent. Template code must guard for that (renders no link). This is a soft, runtime dependency on another module.
- The component name is declared in a separate `<script>` block solely for devtools / `<KeepAlive>`; the logic lives entirely in `<script setup>`.
- Amount filter fields are `string` in state and only converted to numbers at the `load()` boundary. Never assign a number directly into `filters.amountMin/Max` expecting the form to stay in sync.
