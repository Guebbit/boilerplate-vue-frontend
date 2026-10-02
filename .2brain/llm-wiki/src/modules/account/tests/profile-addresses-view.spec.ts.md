---
source: src/modules/account/tests/profile-addresses-view.spec.ts
sha256: 819761ffd4a62aab4756cf6406070281d9cadb2bfa934618b97a19beae1c0fab
generated_at: 2026-10-02T12:27:52.349135+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-addresses-view.spec.ts

## Purpose
Unit test for the save-payload logic that `ProfileAddresses.vue` builds from its dialog fields — specifically the create vs. edit distinction for optional fields (`label`, `phone`). It exists because `addresses.spec.ts` (the store test) does not exercise the component-level payload construction, and AUDIT_0924 D17c requires empty-on-edit to send `null` (not `""`, not omitted) while create must omit the keys entirely.

## Key elements
- **`OFFICE`** – A single address fixture pre-seeded into the store to drive both test cases.
- **`V_COUNTRY_SELECT_STUB`** – Replaces `v-autocomplete` with a bare `<input>` so it keeps the same positional index inside `findAll('input')` as the original `v-text-field` had before the E12 refactor.
- **`mountPanel()`** – Mounts `ProfileAddresses` with Vuetify + i18n plugins, stubs `VDialog`/`VAutocomplete`, pre-seeds the store with `OFFICE`, and returns the wrapper alongside spies on `updateAddress` / `addAddress` (and a no-op `fetchAddresses`).
- **`dialogInputs(wrapper)`** – Returns all `<input>` elements inside `[data-test=address-dialog]` in template order: label, fullName, street, zip, city, country, phone.
- **Test: "sends null for an emptied label and phone on an edit"** – Clears fields 0 and 6, submits, asserts `updateAddress` was called with `{ label: null, phone: null }` validated against `schemas.UpdateAddressBody`.
- **Test: "omits label and phone on a create"** – Fills required fields only, submits, asserts the `addAddress` payload does **not** contain `label` or `phone` keys, validated against `schemas.AddAddressBody`.

## Relationships
- **`tests/support/unit/wire-modules.ts`** → `wireModulesIntoCore()` is called at module top-level (before any `describe`) to register the Vite/`@` alias resolution and module wiring the component needs to import its store and i18n.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** → `contractRequest(schema, body)` is used in both assertions to validate the outgoing payload against the generated OpenAPI schema (`schemas.UpdateAddressBody` / `schemas.AddAddressBody`) and return the conformed object for further property checks.

## Notes
- **Positional input indexing is fragile.** `dialogInputs` relies on `findAll('input')` order matching the e2e spec (`tests/e2e/profile.cy.ts`). Only `phone` has its own `data-test`; the rest are addressed by index. Adding/removing an input before index 6 will silently break the edit test.
- **Stub choice is intentional.** The `VAutocomplete` stub must remain an `<input>` (not `<select>`) to preserve the same array position as the pre-E12 `v-text-field`. Swapping to a `<select>` shifts indices.
- **`VDialog` is stubbed to a pass-through `<div>`** so the dialog content is always in the DOM and queryable without Vuetify's overlay/teleport machinery.
- The test file imports the store from `@/modules/account/stores/addresses.ts` (note the `.ts` extension) rather than the bare module path used elsewhere.
