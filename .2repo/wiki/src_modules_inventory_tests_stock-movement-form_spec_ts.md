# src/modules/inventory/tests/stock-movement-form.spec.ts

## Purpose

Vitest suite that exercises the two mode branches of `StockMovementForm` — *receipt* and *adjust* — to verify their distinct amount-validation rules: receipts reject non-positive and fractional quantities, adjustments reject zero and fractional deltas but pass signed negatives through unchanged.

## Key elements

- **`V_SELECT_STUB`** — Replaces Vuetify's `v-select` (which needs a teleported overlay to pick an option) with a plain `<select>` so `setValue('p1')` works without DOM-teleport gymnastics.
- **`mountForm(mode)`** — Seeds one product into `useProductsStore`, then mounts `StockMovementForm` with the given `mode` prop, Vuetify + i18n plugins, and the VSelect stub.
- **`submitAmount(wrapper, amount, dataTestPrefix)`** — Shared helper: sets the product field, types the amount into the mode-specific input (`receipt-quantity` or `adjust-delta`), then triggers form submit.
- **`describe('the receipt form')`** — Two cases: non-positive quantity is rejected (error text shown, `receive` not called); fractional quantity is rejected (`.int()` rule).
- **`describe('the adjustment form')`** — Three cases: zero delta rejected; fractional delta rejected; negative delta (−3) is forwarded as-is to `inventory.adjust` (not abs-ified).
- **`beforeEach`** — Fresh Pinia instance per test and loads the `en` locale.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at module top-level (outside any hook) to register DI bindings so the stores and components resolve correctly in the test environment.
- **`StockMovementForm.vue`** (component under test) — Mounted via `@vue/test-utils`; its `mode` prop selects the schema branch, and its `data-test` attributes (`receipt-*` / `adjust-*`) are the selectors the helpers target.
- **`useInventoryStore`** — Spied on in every case to assert that the store method is *not* called on invalid input, or *is* called with the exact signed value on valid input.
- **`useProductsStore`** — Seeded with product `p1` before each mount; `fetchProducts` is additionally mocked in the negative-delta test to avoid a network call.

## Notes

- The VSelect stub is necessary because a real Vuetify `v-select` only commits a selection after its teleported overlay interaction; the stub keeps the test focused on the amount schema logic.
- `wireModulesIntoCore()` runs at import time (not inside `beforeEach`), so it executes exactly once for the whole suite.
- The negative-delta test mocks both `inventory.adjust` and `products.fetchProducts` with `mockResolvedValue` to prevent unhandled async work after the assertion.
- Error-message assertions rely on exact user-facing strings from the component; if those strings change, the tests break (by design).
