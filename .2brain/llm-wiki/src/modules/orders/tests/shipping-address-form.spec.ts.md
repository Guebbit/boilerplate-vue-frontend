---
source: src/modules/orders/tests/shipping-address-form.spec.ts
sha256: 820890a7ad08d478a77422f90b73d8b70c6635271e49476702d8c4b6e27954e4
signature: f0006dfdf082f06430bfdac32fac9840cd77c2252f813855451711350382146f
generated_at: 2026-11-10T05:05:17.440297+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/shipping-address-form.spec.ts

## Purpose

Unit tests for the staff-facing "correct the shipping address" form. Verifies that the component seeds fields from the order's current address, enforces required-field validation before any store call, builds a correct payload (including conditional phone), and surfaces a server-locked (409) message in place rather than emitting success.

## Key elements

- **`CURRENT`** — Fixture object holding the address the order currently ships to (`fullName`, `street`, `city`, `zip`, `country`). Used as the base for every assertion.
- **`mountForm()`** — Helper that (1) grabs the Pinia orders store, (2) spies on `correctShippingAddress` *before* mounting, (3) mounts `ShippingAddressForm` with `vuetify` + `i18n` plugins and the `orderId`/`address` props. Returns `{ wrapper, correct }`.
- **`beforeEach`** — Resets the active Pinia instance and loads the `'en'` locale.
- **`describe('ShippingAddressForm')`** — Four cases:
  - Sends the full address object (only the edited field changed) and emits `corrected`.
  - Blocks submission and makes no store call when a required field is emptied.
  - Includes `phone` in the payload only when the user typed one.
  - On a 409 with `ORDER_ADDRESS_LOCKED`, displays the server message and does **not** emit `corrected`.

## Relationships

- **`src/modules/orders/components/ShippingAddressForm.vue`** — The component under test; imported and mounted directly with `@vue/test-utils`.
- **`src/modules/orders/store.ts`** — Provides `useOrdersStore`; the spec spies on its `correctShippingAddress` action (the single write-path) and asserts the component calls it with the right arguments.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked once at module top-level to register shared test doubles before any test runs.

## Notes

- The store spy is installed **before** `mount()` (inside `mountForm`), matching the convention stated in the file's module comment and in sibling form specs. Tests therefore assert the component→store contract, not the HTTP layer.
- The 409 error is crafted with `Object.assign(new Error('locked'), { status, errors })` to mirror the shape the real API client would attach; the test reads `errors[0].message` via the component's `[data-test=shipping-address-error]` element.
- `wireModulesIntoCore()` runs once per test file (module scope), not per test, so it must be idempotent or order-independent.
