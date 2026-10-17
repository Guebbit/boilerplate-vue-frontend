---
source: src/modules/inventory/views/PreordersBoard.vue
sha256: b806a3a01b5fc60122dd02a9f9a75f55d59079ad32701a6f2907bbe478162eb2
generated_at: 2026-10-17T01:02:29.606255+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/views/PreordersBoard.vue

## Purpose

Staff-facing preorder board page offering two tabs — "Products" (allowance and per-state unit counts) and "Fulfillment orders" (one row per order with buyer and dates). Tab selection and the product filter for the second tab are persisted in the URL query string (`?tab=`, `?productId=`) so links and reloads restore the exact view.

## Key elements

- **Named component block** (`export default { name: 'PreordersBoardPage' }`) — provides a stable name for `<KeepAlive>` and devtools; required because `<script setup>` cannot declare one.
- **`BoardTab` type** — union `'products' | 'orders'` governing the two tab states.
- **`tabs` (computed)** — returns both tabs or only `['orders']` depending on whether the session has `read:StockLevel`.
- **`firstTab` (computed)** — the default landing tab: `products` when available, else `orders`.
- **`initialTab()`** — reads `?tab=` from the route, falling back to `firstTab` if the requested tab is not available to this viewer.
- **`activeTab` (ref)** — currently visible tab.
- **`productId` / `productLabel` (refs)** — the product the orders tab is filtered to; `productLabel` is a display name set when the user navigates from the products tab.
- **`syncUrl()`** — writes `tab` and `productId` into the query via `router.replace`; omits `tab` when it equals `firstTab` to keep the URL clean.
- **`selectTab(tab)`** — switches the active tab and syncs the URL.
- **`showOrders(id, title)`** — handler for the products table's "show orders" action: sets the product filter, switches to the orders tab.
- **`clearProduct()`** — removes the product filter and syncs the URL.
- **`<v-tabs>` / `<v-tabs-window>`** — Vuetify tab UI; the products window-item is conditionally rendered only when the viewer has the stock-reading permission.

## Relationships

- **`src/modules/inventory/components/PreorderProductsTable.vue`** — imported as a child component inside the "products" tab window-item. Emits `show-orders` (carrying product id and title), which this page handles via `showOrders`.
- **`src/modules/inventory/tests/preorders-board-view.spec.ts`** — unit/integration spec that exercises this component's tab switching, permission gating, and URL-sync behavior.

## Notes

- The "products" tab is **permission-gated** (`read:StockLevel`); the page itself only requires `display:Order`. A viewer without stock permission never sees the tab and the `?tab=products` param is silently ignored.
- `syncUrl` uses `router.replace`, not `push`, so tab switches and product-filter changes do not create separate back/forward history entries.
- When the active tab equals `firstTab`, the `tab` query parameter is set to `undefined` (omitted) rather than explicitly written, keeping the default URL clean.
- `productLabel` is only populated when the user arrived via a click from the products tab; a direct deep-link with `?productId=` will have an undefined label.
