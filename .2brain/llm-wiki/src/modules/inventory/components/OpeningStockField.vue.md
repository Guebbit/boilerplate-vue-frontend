---
source: src/modules/inventory/components/OpeningStockField.vue
sha256: f0fd9e218f4f9d123c355e0ffabcbf578d9b2e9ab85cef56984dd2d93652c13f
signature: cb1fd743fbf7fbbc878dfce374f31ece0c34afcad582c57c9be33634f6fc047a
generated_at: 2026-11-10T04:30:09.372419+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/components/OpeningStockField.vue

## Purpose

Renders an optional "opening stock" number input that the inventory module injects into the product-create form via the `product-create-extras` slot. It lets a caller record an initial stock quantity as a **post-create side-effect** (a `StockMovement` receipt) without adding stock data to the product-create request body. The field is hidden entirely from callers lacking the `create:StockMovement` permission.

## Key elements

- **`openingStock`** (`ref<number>`) — the value bound to the number input; `0` means "no opening stock" and causes the post-create step to be a no-op.
- **`registerAfterCreate`** (prop) — the form's hook that accepts a `(productId: string) => Promise<void>` step. This component calls it immediately in `<script setup>` to register its receipt logic.
- **`receive`** (from `useInventoryStore`) — performs the stock-movement POST. The store manages its own `Idempotency-Key` across retries; this component does not.
- **`session.can('create', 'StockMovement')`** — gates both the `v-if` on the template and the guard inside the registered step. Without this permission the field is invisible and the step resolves immediately.
- **`<v-number-input>`** — the sole template element (min 0, step 1, integer precision). Carries `data-test="product-on-hand-field"`.

## Relationships

- **`src/modules/inventory/store.ts`** — provides `useInventoryStore().receive(productId, quantity, note)`, the actual API call that books the stock movement. This component is the only consumer in the UI.
- **`src/modules/inventory/tests/opening-stock-field.spec.ts`** — unit-test suite covering the permission gate, zero-quantity short-circuit, success, and failure paths of this component.

## Notes

- The component is **not** a product form field. The create request body contains no stock data; stock is a separate domain concern booked after the product exists.
- The products module owns the create form and **never imports inventory**. Integration is purely via the slot + `registerAfterCreate` contract defined by the module manifest.
- A failed receipt is **non-fatal**: the product remains at zero stock (a valid state), and a toast (`opening-stock-field.failed`) directs the user to the Inventory page.
- Quantities of `0` or `< 1` silently skip the receipt with no toast or error — by design.
- The `data-test` attribute reads `product-on-hand-field`, not `opening-stock-field`; automation selectors should use the former.
