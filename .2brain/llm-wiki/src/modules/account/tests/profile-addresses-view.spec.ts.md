---
source: src/modules/account/tests/profile-addresses-view.spec.ts
sha256: 8a37d561cece0e53637bdc9474ae5b8fd9763cbbaf73bd611a67b2a0ed17c777
generated_at: 2026-10-17T00:24:35.961145+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-addresses-view.spec.ts

## Purpose

Unit test for `ProfileAddresses.vue`'s save-payload construction, scoped to the create/update body the component builds from dialog fields. It fills the gap left by the store-level test (`addresses.spec.ts`): verifying that an emptied label or phone on **edit** serialises to `null` (not `""`, which the API rejects with 422, and not an omitted key, which a PATCH treats as a no-op), and that on **create** those fields are omitted entirely.

## Key elements

- **`mountPanel()`** – Seeds the Pinia store with the `OFFICE` fixture, spies on `updateAddress` / `addAddress` / `fetchAddresses`, mounts the component with Vuetify + i18n plugins, and returns the wrapper alongside the spies.
- **`V_COUNTRY_SELECT_STUB`** – Replaces `v-autocomplete` with a bare `<input>` so the element stays at the same positional index inside `dialogInputs` that the original `v-text-field` occupied.
- **`dialogInputs(wrapper)`** – Returns the dialog's inputs in template order (label, fullName, street, zip, city, country, phone) via `findAll('input')`, matching the indexing used in the e2e spec.
- **`OFFICE`** – Static address fixture used as both the pre-seeded store entry and the resolved value of all spied store methods.
- **Test 1 – "sends null for an emptied label and phone on an edit"** – Clicks edit, clears label (index 0) and phone (index 6), submits, asserts `updateAddress` received `{ label: null, phone: null }` validated against `schemas.UpdateAddressBody`.
- **Test 2 – "omits label and phone on a create"** – Clicks add, fills the required fields, submits, asserts `addAddress` received a body with no `label` or `phone` key, validated against `schemas.AddAddressBody`.

## Relationships

- **`src/modules/account/components/ProfileAddresses.vue`** – The SUT; this file mounts it and exercises its internal save logic.
- **`src/modules/account/stores/addresses.ts`** – `useAddressesStore` is pulled in to seed state and spy on `updateAddress` / `addAddress` / `fetchAddresses`.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register API/transport stubs before any test runs.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – `contractRequest` is used to validate the captured payload against the generated Orval schema (`schemas.UpdateAddressBody`, `schemas.AddAddressBody`) before asserting on individual fields.

## Notes

- The country `v-autocomplete` is stubbed as a plain `<input>` (not a `<select>`) specifically to preserve its positional index among `dialogInputs`; a `<select>` would break the `findAll('input')` assumption.
- `VDialog` is stubbed to a bare `<div><slot /></div>` so the dialog content is always rendered without Vuetify's overlay/teleport machinery.
- The dialog inputs are addressed **positionally** (indices 0–6) rather than by `data-test` attributes, mirroring the convention in `tests/e2e/profile.cy.ts`; only `phone` has its own `data-test`.
- The module-level doc comment is load-bearing: it records the exact API contract nuance (PATCH: `""` → 422, omitted → no-op, `null` → clears) that this test exists to lock in.
