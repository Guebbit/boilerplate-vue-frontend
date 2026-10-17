---
source: src/modules/inventory/components/StockMovementForm.vue
sha256: b865a3d3f50f8b4bb631997529dfa64c2e979d03f5272be34f43064756274ab6
generated_at: 2026-10-17T00:58:32.348823+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/components/StockMovementForm.vue

## Purpose

A single SFC that handles both stock **receipts** (positive deliveries) and stock **adjustments** (signed deltas, typically shrinkage). It is instantiated twice by its parent with a `mode` prop (`'receipt' | 'adjust'`) rather than using a runtime sign toggle, so a mis-click cannot convert one counter-write into the other. Validation, field state, and submit gating are delegated to `useStructureFormValidation` with a Zod schema that branches on the mode.

## Key elements

- **`mode` prop** (`'receipt' | 'adjust'`) — selects which Zod schema branch and which `inventoryStore` action (`receive` vs. `adjust`) the form drives.
- **`isReceipt`** (computed) — convenience boolean used throughout the template and submit logic.
- **`schema`** (computed Zod object) — validates `productId`, `amount` (strictly ≥ 1 for receipts; non-zero integer for adjustments), and optional `note`. Error messages are i18n-resolved.
- **`form` / `formErrors` / `handleSubmit` / `applyServerErrors`** — returned from `useStructureFormValidation`; own the reactive field state, server-error mapping, and submit gating. Seeded defaults: `amount` is `10` for receipts, `-1` for adjustments.
- **`productQuery` / `productOptions` / `pinProduct`** — from `useProductPicker`; drive the server-side (`POST /products/search`) product autocomplete rather than a local cache.
- **`useProductPickerPin`** — keeps the currently selected product resolvable in `productOptions` across subsequent searches.
- **`submitForm`** — validates, then calls `inventoryStore.receive` or `inventoryStore.adjust`; on success refreshes `productsStore.fetchProducts()` and toasts the new available count; on failure maps field-level errors via `applyServerErrors` and catches unmapped 409s into `submitError`.
- **`submitError` / `reportSubmitError` / `clearSubmitError`** — from `useBlockingError`; surfaces the adjustment 409 (stock would drop below reserved) as an inline `InlineErrorAlert` instead of a toast.
- **`VUETIFY_INVALID_FIELD_SELECTOR`** — passed to `useStructureFormValidation` so it can scroll/focus the first invalid Vuetify field.

## Relationships

- **`src/modules/inventory/store.ts`** — `useInventoryStore` provides `receive()`, `adjust()`, and the `loading` flag bound to the submit button.
- **`src/modules/inventory/composables/use-product-picker.ts`** — supplies `useProductPicker` (server-search autocomplete state) and `useProductPickerPin` (pinning the selected product across re-searches).
- **`src/modules/inventory/views/InventoryLedger.vue`** — parent view that instantiates this component twice (once per mode) and passes the `mode` prop.
- **`src/modules/inventory/tests/stock-movement-form.spec.ts`** — unit/integration tests for this component.
- **`src/infrastructure/utils/logger.ts`** and **`src/modules/account/views/TwoFactorChallenge.vue`** — listed as graph neighbors but no direct interaction is visible in this file.

## Notes

- The component declares its `name` in a separate **Options-API `<script>` block** alongside `<script setup>`, because `<script setup>` cannot set `name`. This is required for `<KeepAlive>` / devtools identification.
- Product search is intentionally **server-side** (`POST /products/search` via `useProductPicker`), not the products store's `listProducts()` which only caches the first page.
- The adjustment 409 is treated specially: the server's message (e.g. "cancel orders to free stock") is surfaced **verbatim** in the inline `InlineErrorAlert` rather than being re-translated or pushed to the toast queue.
- After a successful write, `productsStore.fetchProducts()` is called to synchronise the catalogue's local copy of stock counters — the picker itself does not cache counters.
- `note` is optional in the Zod schema but is stripped (`|| undefined`) before the store call, so the API never receives an empty-string note.
