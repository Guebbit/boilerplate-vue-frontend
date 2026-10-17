---
source: src/modules/inventory/components/OpeningStockField.vue
sha256: f0fd9e218f4f9d123c355e0ffabcbf578d9b2e9ab85cef56984dd2d93652c13f
generated_at: 2026-10-17T00:57:36.148047+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/components/OpeningStockField.vue

## Purpose

A slot-contributed numeric input for the product create form that lets the user specify opening stock. The inventory module registers this component into the products module's `product-create-extras` slot via its manifest, so the products module never imports inventory code directly. Stock is not a product field; this component defers the write until after the product row exists.

## Key elements

- **`registerAfterCreate` prop** – the form passes a callback-registration function. This component immediately calls it with an async step that runs once the new product's id is available.
- **`openingStock` (ref, default `0`)** – the user-facing quantity. Zero (or a falsy value) short-circuits the after-create step.
- **After-create step** – on creation, calls `receive(productId, quantity, note)` from the inventory store. On rejection it fires a `failed` toast via the notifications store and does **not** roll back the product (zero stock is a valid state).
- **`<v-number-input>` template** – rendered only when `session.can('create', 'StockMovement')` is true. Integer-only (`precision: 0`, `step: 1`, `min: 0`). Carries `data-test="product-on-hand-field"`.

## Relationships

- **`src/modules/inventory/store.ts`** – imports `useInventoryStore` and calls its `receive` action. The store owns the `Idempotency-Key` so a retry of the same receipt is safe.
- **`src/modules/inventory/tests/opening-stock-field.spec.ts`** – unit tests for this component's rendering and after-create behaviour.

## Notes

- The component is entirely invisible to callers without the `create:StockMovement` permission—both the template (`v-if`) and the after-create step (`session.can` guard) check it.
- "Zero" is a deliberate no-op, not an error; the after-create step resolves immediately.
- The note string passed to `receive` is the `t('opening-stock-field.note')` translation, serving as the stock-movement memo.
- Because this is slot-contributed, the products module's form template contains no reference to inventory; the wiring lives in the inventory module's manifest.
