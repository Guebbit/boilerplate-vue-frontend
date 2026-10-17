---
source: src/modules/delivery/components/PreorderFulfillmentTable.vue
sha256: 632d7910130bf08663dcea4439047f4dab6c9c96e53da9ec369b240de675017a
generated_at: 2026-10-17T00:46:28.762860+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/PreorderFulfillmentTable.vue

## Purpose

Renders the second tab of the preorder board: a paginated table of fulfillment orders created from preorders, showing buyer, dates, state, and line items. It provides server-side filters for order state, lateness, and "due soon" window, plus a closable product-filter chip inherited from the sibling products tab.

## Key elements

- **`load()`** — Calls `store.fetchPreorderBoard` with the current page, filters, and product ID; toasts errors via `notifyErrorMessages`.
- **Filter state** — `state`, `lateOnly`, `dueSoonOnly` refs drive the server query; a `watch` resets to page 1 on any filter change and another `watch` triggers `load` on page change.
- **`stateOptions`** — Computed `v-select` items (null = "any", then each value in `STATES`).
- **`headers`** — Computed `CoreDataTableHeader[]` defining the eight columns of the table.
- **`orderLink(orderId)`** — Resolves an order ID to a route via `linkIfRouted` / `routerLinkI18n`; returns `undefined` when the orders module is absent, degrading the cell to plain text.
- **`STATE_COLORS`** — Maps every `PreorderFulfillmentState` to a Vuetify color name for the state chip; uses `satisfies Record<…>` so a new state fails the type check.
- **Props** — `productId`, `productLabel` (optional) supply the product filter from the parent page.
- **Emits** — `clearProduct` — fired when the user clicks the chip's close button.
- **Constants** — `PAGE_SIZE` (10), `DUE_SOON_DAYS` (7), `STATES` (the five server-known states in filter order).

## Relationships

- **`src/modules/delivery/store.ts`** — Primary data source. `useDeliveryStore` provides `fetchPreorderBoard` (action) and the reactive refs `preorderBoard`, `preorderBoardTotal`, `loading` that this component renders.
- **`src/modules/delivery/index.ts`** — Module barrel; this component is the fulfillment-orders view exported for the delivery module's page composition.
- **`src/modules/delivery/tests/preorder-fulfillment-table.spec.ts`** — Unit/integration spec exercising this component's filters, rendering, and store interaction.

## Notes

- The file uses a **dual-script pattern**: a plain `<script>` block declares `name: 'PreorderFulfillmentTable'` (required for `<KeepAlive>` and devtools since `<script setup>` cannot set it), while all logic lives in `<script setup>`.
- "Late" and "Due soon" are **server-computed booleans** (`item.late`, `dueWithin` query param). The component never recalculates them client-side; the `DUE_SOON_DAYS` constant is only sent as a query parameter.
- `STATES` and `STATE_COLORS` both use TypeScript `satisfies` against the `PreorderFulfillmentState` union, so adding a new state to the shared type without updating either map is a compile error.
- The filter `watch` short-circuits (`if (page.value === 1) return load()`) to avoid a redundant fetch when the user is already on page 1 and toggles a filter.
