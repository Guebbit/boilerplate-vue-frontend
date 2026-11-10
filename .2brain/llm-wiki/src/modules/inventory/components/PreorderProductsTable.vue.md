---
source: src/modules/inventory/components/PreorderProductsTable.vue
sha256: f378701e90760d7357f5d045a751a683a0f413e848b55435595eb2d3df641d4b
signature: 1348d3ab762f5db716fa8e9fe570811013cbfc4dc59619797ded08e9786d9ba3
generated_at: 2026-11-10T04:30:22.988407+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/components/PreorderProductsTable.vue

## Purpose

The first tab of the preorder board. Renders one row per product sold as a preorder, joining its inventory allowance (limit, outstanding, left) with delivery unit-state counts (waiting, allocated, shipped, canceled, late) into a single paginated table. It lets a viewer see at a glance which preorders are most at risk and act on them (jump to fulfillment orders or move the release date).

## Key elements

- **`preorderRows(preorderLevels, summaries)`** (from `../domain`) — joins the two reads into a `PreorderRow[]`, ordered worst-first.
- **`load()`** — fires `inventoryStore.fetchPreorderLevels()` and `loadSummaries()` in parallel; toasts any failure via `notifyErrorMessages`. Called in `onMounted`.
- **`rows` / `pageRows` / `pageTotal`** — computed properties implementing local pagination (10 rows/page) over the joined list.
- **`countsOf(row)`** — filters `STATE_COUNTS` to only non-zero states for display as chips; zero-count states are omitted.
- **`editLink(productId)`** — returns an i18n-aware route to the product edit page only when the viewer has `update` permission on `Product` **and** the route is registered in this build; otherwise `undefined`.
- **`emit('showOrders', productId, title)`** — signals the parent board to narrow its second (fulfillment-orders) tab to this product.
- **`STATE_COUNTS`** — const array defining the order and label keys for the five unit-state chips; `late` gets an `error` chip color.

## Relationships

- **`src/modules/inventory/domain/index.ts` / `preorder-rows.ts`** — provides the `preorderRows` join function and the `PreorderRow` type consumed throughout the component.
- **`src/modules/inventory/store.ts`** — `useInventoryStore` supplies `preorderLevels`, `loading`, and `fetchPreorderLevels()` (the inventory half of the join).
- **`src/modules/inventory/views/PreordersBoard.vue`** — parent view that mounts this component as its first tab and listens for the `showOrders` emit to drive the second tab.
- **`src/modules/inventory/tests/preorder-products-table.spec.ts`** — unit/integration tests for this component's rendering and interactions.

## Notes

- "Outstanding" (`backordered`) is units still owed, **not** units sold; it decreases as stock is allocated.
- The release date is **not** editable from this table — the "move date" button is a link to the product edit form, gated on the `update:Product` permission.
- Both reads are assumed to hold the full (short) product list, so pagination is purely client-side slicing; no server-side paging is requested.
- The `name` option is declared in a separate non-setup `<script>` block because `<script setup>` cannot declare a component `name`; this is needed for `<KeepAlive>` and devtools.
