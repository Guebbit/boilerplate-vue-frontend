---
source: src/modules/inventory/tests/opening-stock-field.spec.ts
sha256: 31a573df94f2e1a1c3c7f01933f99f5da2c8ec6f1f287901127d497c4d61123a
generated_at: 2026-10-17T01:00:25.407071+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/opening-stock-field.spec.ts

## Purpose

Unit tests for the `OpeningStockField` component, verifying that the opening-stock input (slotted into the product-create form via `product-create-extras`) is gated on the `create StockMovement` ability, registers exactly one post-create step that delivers the typed count through the inventory door, and never throws if the receipt fails.

## Key elements

- **`mountFieldAs(abilities)`** — Mounts `OpeningStockField` with a session viewer holding the given `[action, subject]` abilities, spies on `useInventoryStore().receive`, and captures any step passed to the `registerAfterCreate` prop. Returns `{ wrapper, steps, receive }`.
- **`typeCount(wrapper, quantity)`** — Sets the input value on `[data-test=product-on-hand-field]` and flushes promises.
- **"is offered to a caller who may book stock…"** — Asserts the field renders only when the tenant abilities include `create StockMovement`; hidden with `create Product`.
- **"receives the typed count against the new product…"** — Types `5`, invokes the registered step with a product ID, and asserts `receive` was called with `('p2', 5, 'Opening stock')`.
- **"receives nothing when no count was typed…"** — Confirms `receive` is never called when the input is empty or the caller lacks the stock ability.
- **"settles when the receipt fails…"** — Mocks `receive` to reject and asserts the step still resolves, so the surrounding product-creation flow is never undone.

## Relationships

- **`src/modules/inventory/components/OpeningStockField.vue`** — The component under test; mounted directly via `@vue/test-utils`.
- **`src/modules/inventory/store.ts`** — Exports `useInventoryStore`; its `receive` method is spied on to assert outgoing stock deliveries.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope so that the Pinia store and other module registrations are available before any test runs.

## Notes

- The component communicates with the host form exclusively through the `registerAfterCreate` prop (a callback); there is no direct store call from the component itself. Tests therefore capture the step via the prop rather than observing the component's internal state.
- `wireModulesIntoCore()` runs once at import time, not inside `beforeEach`. Pinia, by contrast, is re-created per test via `setActivePinia(createPinia())`.
- The "door" pattern: the component renders nothing and registers no step when the viewer lacks the `create StockMovement` ability. Tests confirm both the visual absence and the absence of a registered step.
