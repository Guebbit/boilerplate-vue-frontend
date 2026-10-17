---
source: src/modules/inventory/tests/stock-movement-form.spec.ts
sha256: ac28cfce073dee27878cba6331dfceb1840b4d47be5ef87e32cd299ad6a1336a
generated_at: 2026-10-17T01:01:42.138318+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/stock-movement-form.spec.ts

## Purpose

Vitest suite that proves the two `mode` branches of `StockMovementForm` enforce different amount schemas: receipt rejects non-positive and fractional quantities, while adjust rejects zero and fractional deltas but carries a negative delta through signed (not absolute). It mounts the real component twice (once per mode) to confirm the branches genuinely differ.

## Key elements

- **`mountForm(mode)`** — Seeds one product (`p1`) into the products store, then mounts `StockMovementForm` with the given `mode` prop, Vuetify, i18n, and a `VAutocomplete` stub.
- **`submitAmount(wrapper, amount, dataTestPrefix)`** — Shared helper: sets the product select, types the amount into the mode-specific input, and triggers form submit.
- **`V_AUTOCOMPLETE_STUB`** — Minimal native `<select>` replacement for Vuetify's teleported `v-autocomplete`; keeps the product field fillable via `setValue` without overlay/debounce side-effects.
- **`vi.mock('@api')`** — Replaces `searchProducts` with an immediate empty resolution so no pending timer outlives the test.
- **`describe('the receipt form')`** — Two cases: non-positive quantity rejected (error text asserted, `receive` never called); fractional quantity rejected (`.int()` rule).
- **`describe('the adjustment form')`** — Three cases: zero delta rejected; fractional delta rejected; negative delta (`-3`) passed to `adjust('p1', -3, undefined)`.

## Relationships

- **`StockMovementForm.vue`** — The component under test. Mounted with `props: { mode }` and queried via `data-test` attributes (`receipt-product`, `adjust-delta`, etc.).
- **`store.ts` (inventory)** — `useInventoryStore().receive` and `.adjust` are spied/mocked to assert either they are *not* called (invalid input) or called with the correct signed argument (valid negative delta).
- **`tests/support/unit/wire-modules.ts`** — Called once at module top (`wireModulesIntoCore()`) to register Pinia stores and other cross-module wiring before any test runs.

## Notes

- The `VAutocomplete` stub exists solely because the real component teleports an overlay and fires a debounced `searchProducts` on mount — both irrelevant to schema validation. Removing the stub would make `setValue` unreliable and leak a timer.
- Both modes share the `.int()` constraint; the test explicitly documents that fractions are rejected in *both* branches, not just receipt.
- The negative-delta test also mocks `useProductsStore().fetchProducts` to avoid a real fetch triggered by the successful submit path.
