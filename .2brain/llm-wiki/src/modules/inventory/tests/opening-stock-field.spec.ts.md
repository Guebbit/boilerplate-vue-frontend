---
source: src/modules/inventory/tests/opening-stock-field.spec.ts
sha256: 31a573df94f2e1a1c3c7f01933f99f5da2c8ec6f1f287901127d497c4d61123a
signature: 05ec2786e8d846ebc6a7ae80ca71d47a540ef031ab9c7b40a01407a8a70a5fb4
generated_at: 2026-11-10T04:34:31.030699+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/opening-stock-field.spec.ts

## Purpose
Vitest spec for `OpeningStockField.vue`. Verifies the field's visibility gate (only renders for callers holding a `StockMovement` create ability), that a typed count is dispatched via the inventory store's `receive` as an "Opening stock" movement against the newly created product, that no dispatch occurs when the count is empty or the ability is absent, and that a rejected receipt still resolves so the enclosing product-creation flow is never rolled back.

## Key elements
- **`mountFieldAs(abilities)`** – Mounts `OpeningStockField` with a pre-seeded session (token, viewer, abilities), spies on `useInventoryStore().receive`, and captures the step registered through the `registerAfterCreate` prop. Returns `{ wrapper, steps, receive }`.
- **`typeCount(wrapper, quantity)`** – Locates `[data-test=product-on-hand-field] input`, sets its value, and flushes promises.
- **`describe('OpeningStockField', …)`** – Four tests:
  - *Visibility* – field exists with `['create','StockMovement']`; absent with `['create','Product']`.
  - *Happy path* – typing 5 then invoking the registered step calls `receive('p2', 5, 'Opening stock')`.
  - *No-op cases* – empty count or missing ability → `receive` never called (step still registered and resolvable).
  - *Error isolation* – `receive` rejected once; the step still resolves to `undefined` so the caller's promise chain is never rejected.

## Relationships
- **`src/modules/inventory/components/OpeningStockField.vue`** – the component under test; mounted with Vuetify + i18n plugins.
- **`src/modules/inventory/store.ts`** – `useInventoryStore` is imported solely to spy on `receive`, the method the field calls to book stock.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is invoked once at module top-level to register module-level dependencies in the Vitest environment before any test runs.

## Notes
- `wireModulesIntoCore()` executes at **import time** (top-level statement), not inside `beforeEach`; it is idempotent across the whole spec run.
- In the "no stock key" test the step **is** still registered (the test calls `keyless.steps[0]`), meaning the component registers the step unconditionally; the step itself is a no-op when the ability is absent.
- The error-isolation test uses `mockRejectedValueOnce` and asserts `resolves.toBeUndefined()`, confirming the component swallows the rejection rather than rethrowing it.
- `beforeEach` creates a fresh Pinia instance **and** reloads the `en` locale each time, so tests are isolated from prior state.
