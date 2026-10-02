---
source: src/modules/inventory/components/StockMovementForm.vue
sha256: b7bd81af0608e9f430106605ba91340788873f30d85a6d23bc94563bfb861c21
generated_at: 2026-10-02T15:09:29.385894+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/components/StockMovementForm.vue

## Purpose

A reusable stock-movement form that handles both receipts (adding units) and adjustments (signed deltas, including shrinkage). It is instantiated **twice** — once per mode — rather than as a single form with a runtime sign toggle, so a mis-click cannot silently convert a delivery into a correction (or vice versa).

## Key elements

- **`props.mode` (`'receipt' | 'adjust'`)** — Selects which domain write the form performs and which validation rules apply. Drives nearly every branch in the component.
- **`schema` (computed Zod object)** — Branches on `isReceipt`: receipts require `amount ≥ 1`; adjustments require `amount ≠ 0` (any non-zero integer). `productId` is a non-empty string; `note` is a free-text string.
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) — Owns reactive field state, per-field errors, revalidation on locale change, native-form validity wiring via `formElement`, and the `handleSubmit` / `applyServerErrors` cycle.
- **`useProductPicker` / `useProductPickerPin`** (local composable) — Server-side product search (`POST /products/search`) for the `v-autocomplete`; the pin keeps the currently selected product resolvable even after a subsequent search narrows the list.
- **`useBlockingError`** (local composable) — Renders an un-mapped server error (notably the 409 "would leave fewer units than are already reserved") inline next to the submit button via `InlineErrorAlert`, rather than pushing it into the toast queue.
- **`submitForm`** — Calls `inventoryStore.receive` or `inventoryStore.adjust`, reports the resulting stock level via a toast, clears the note field, and refreshes `productsStore.fetchProducts()` so the catalogue's cached counters stay in sync.
- **`useInventoryStore` / `useProductsStore`** — Pinia stores; the former owns the actual API writes and the shared `loading` flag, the latter is refreshed after a successful write.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — No direct import or interaction is visible in this file.
- **`src/modules/account/views/TwoFactorChallenge.vue`** — No direct import or interaction is visible in this file.

Neither listed neighbor is imported or referenced here; the dependency-graph link is likely transitive (e.g., shared infrastructure or a common parent view).

## Notes

- The component's `<script>` block (non-setup) exists solely to declare `name: 'StockMovementForm'` for DevTools / `<keep-alive>` matching; all logic lives in `<script setup>`.
- The product picker deliberately uses `POST /products/search` (paginated, server-filtered) instead of the products store's `listProducts()`, which only holds the first page (ticket FE_PARITY_0924 B2). The `v-autocomplete` sets `no-filter` to disable Vuetify's client-side item filtering since the server already handles it.
- On adjustment, the 409 response is the "interesting" failure: the server's message already names the fix (cancel reserved orders), so `reportSubmitError` passes it through verbatim into the inline `InlineErrorAlert` rather than the toast.
- `note` is sent as `undefined` (omitted) when empty, not as an empty string.
- `data-test` attributes are mode-prefixed (`receipt-*` vs `adjust-*`) so E2E selectors work against both instances unambiguously.
