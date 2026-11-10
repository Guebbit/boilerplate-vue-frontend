---
source: src/modules/inventory/views/PreordersBoard.vue
sha256: ea79a8108ff5f0c8a021b87ced540751a48ee4356a139f5d42e8889db6e3ca60
signature: 6070726fae9b217637a8505f87455eee02fa08867ca391ce2119c5ba35a8b9fb
generated_at: 2026-11-10T04:38:03.263983+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/views/PreordersBoard.vue

## Purpose

Staff-facing preorder board page. Presents two tabs over existing backend data: a per-product stock/allowance view ("Products") and a fulfillment-order list with buyer, dates, and Late/Due-soon filters ("Orders"). Tab and product-filter state are persisted in the URL query string so links and reloads restore the same view.

## Key elements

- **`name: 'PreordersBoardPage'`** — declared in a separate `<script>` block so the component gets a stable name for devtools and `<KeepAlive>` (not possible inside `<script setup>`).
- **`tabs` (computed)** — permission-gated list of available tabs. "Products" appears only when the session grants `read:StockLevel`; "Orders" is always present.
- **`initialTab()` / `activeTab`** — reads `?tab=` from the route, falling back to the first available tab if the requested one is not permitted.
- **`productId` / `productLabel`** — optional product filter for the Orders tab, sourced from `?productId=` or set when the user clicks a product in the Products tab.
- **`syncUrl()`** — writes `tab` and `productId` into the query via `router.replace`, so tab/product changes don't create extra history entries. Omits the `tab` param entirely when the active tab is the default.
- **`selectTab(tab)`** — switches the active tab and syncs the URL.
- **`showOrders(id, title)`** — handler for the Products tab's "view orders" action; sets the product filter and switches to the Orders tab.
- **`clearProduct()`** — resets the product filter and syncs the URL.
- **Template** — Vuetify `v-tabs` / `v-tabs-window` layout rendering `PreorderProductsTable` (conditional on permission) and `PreorderFulfillmentTable`.

## Relationships

- **`src/modules/inventory/components/PreorderProductsTable.vue`** — imported and rendered inside the Products tab; emits `show-orders(id, title)` which this page wires to `showOrders`.
- **`src/modules/delivery` → `PreorderFulfillmentTable`** — imported and rendered inside the Orders tab; receives `:product-id`, `:product-label`, and emits `clear-product`.
- **`src/modules/inventory/tests/preorders-board-view.spec.ts`** — unit/integration spec covering this view's rendering and tab-switching behavior.

## Notes

- The page-level permission is `display:Order`; the Products *tab* additionally requires `read:StockLevel`. A viewer lacking that permission never sees the Products tab, and a `?tab=products` URL silently falls back to Orders.
- `syncUrl` intentionally omits the `tab` query param when the active tab equals the default, keeping URLs clean for the "rest" state.
- Floating-promise lint suppressions on `void syncUrl()` calls: router navigation failures are expected to surface through `router.onError`, not via the caller.
