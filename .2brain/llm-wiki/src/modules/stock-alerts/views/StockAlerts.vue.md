---
source: src/modules/stock-alerts/views/StockAlerts.vue
sha256: b8f4c43817f0f7b830ba28c4c5ecefa4d65cc2ed9ede709a0cdaecdefe1fe108
signature: b8f4c43817f0f7b830ba28c4c5ecefa4d65cc2ed9ede709a0cdaecdefe1fe108
generated_at: 2026-11-10T05:56:00.984610+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stock-alerts/views/StockAlerts.vue

## Purpose

The shopper-facing page that lists their open "notify me" stock-alert requests and lets them cancel any one. A request is single-use: once a product's stock is answered, the record is simply absent from the list.

## Key elements

- **Component name** – `StockAlertsPage` (set in the legacy `<script>` block for devtools / `<KeepAlive>`).
- **`handleCancel(productId)`** – Clears any prior inline error, calls the store's `cancel` action, toasts a success message on resolution, and surfaces an inline blocking error on rejection.
- **`onMounted` hook** – Calls `fetchStockAlerts()`, then resolves each `productId` into a product title via `loadProducts`. Fetch failures are reported as ambient (toast) errors.
- **Store bindings** – `items` and `loading` are reactive refs from `useStockAlertsStore`; `fetchStockAlerts` and `cancel` are its actions.
- **`useBlockingError`** – Provides `actionError`, `report`, and `clear` for the inline error shown above the list; a single cancel failure blocks further cancels without hiding the list.
- **`useAmbientError`** – Returns a toast-dispatching handler used for background read failures that have no form to host an inline message.
- **`useProductLines`** – Supplies `titleOf(id)` to display product names (the alerts store only stores `productId`) and `loadProducts(ids)` to hydrate those records.

## Relationships

- **`src/modules/stock-alerts/store.ts`** – Primary data source. The view reads `items`/`loading` reactively and delegates all mutations (`fetchStockAlerts`, `cancel`) to the store. The view owns no stock-alert state of its own.
- **`src/infrastructure/utils/logger.ts`** – Not imported directly here; it is a transitive dependency reachable through the error-utility modules (`useBlockingError`, `useAmbientError`).

## Notes

- Product titles are resolved *after* the initial fetch via `loadProducts`; if the products store has not yet loaded a given id, `titleOf` will return a fallback/empty value until hydration completes.
- The cancel button is disabled while *any* store call is in flight (`loading`), not just the specific cancel in progress.
- `data-test` attributes are present on every interactive/structural element for e2e selectors.
- i18n keys are namespaced under `stock-alerts-page.*`.
