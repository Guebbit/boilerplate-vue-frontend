---
source: src/modules/account/tests/profile-addresses-view.spec.ts
sha256: 9b4f9ed88c7ada452178637ff1307f50120b1648ee8e0e73b555758f0b7c504d
signature: 7e28c3d4962078cdab7da2026211de1c14d77f255a4470e89e64cec15c722723
generated_at: 2026-11-10T03:38:24.688325+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/profile-addresses-view.spec.ts

## Purpose

Unit-tests the save-payload construction and card rendering in `ProfileAddresses.vue` — specifically the create/update body the component itself builds from dialog fields, which the store-level test (`addresses.spec.ts`) does not cover. It also verifies that the country is displayed by name (translated) rather than by its stored ISO code.

## Key elements

- **`OFFICE`** – Fixture object representing a single existing address entry used to pre-seed the store before each test.
- **`V_COUNTRY_SELECT_STUB`** – Minimal `<input>`-based stub for the country `v-autocomplete`, deliberately not a `<select>` so it occupies the same positional index in `findAll('input')` as the original `v-text-field`.
- **`mountPanel()`** – Mounts `ProfileAddresses` with Pinia + Vuetify + i18n, stubs `VDialog` and `VAutocomplete`, seeds `store.addresses`, and spies on `fetchAddresses` / `updateAddress` / `addAddress` so each test asserts only on the outgoing payload.
- **`dialogInputs(wrapper)`** – Returns the dialog's text inputs in template order (label, fullName, street, zip, city, country, phone), matching the positional indexing used in the e2e spec.
- **`describe('ProfileAddresses save payload')`** – Two tests: (1) emptied label/phone on an edit must serialize as `null` (not `''`, not omitted); (2) a create with no label/phone must omit those keys entirely.
- **`describe('ProfileAddresses card')`** – Asserts the rendered card shows the full country name ("United States") rather than the stored code ("US").

## Relationships

- **`src/modules/account/components/ProfileAddresses.vue`** – The component under test; mounted directly.
- **`src/modules/account/stores/addresses.ts`** – `useAccountAddressesStore` is instantiated and its `updateAddress` / `addAddress` / `fetchAddresses` actions are spied on to capture and assert the request body.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register the i18n and module wiring needed by the component's template.
- **`tests/support/unit/orval-fixture-schema.ts`** – `contractRequest` validates the outgoing body against the Orval-generated schema (`UpdateAddressBody` / `CreateAddressBody`) before the test asserts specific field values.

## Notes

- The central contract under test is **PATCH semantics**: an emptied field must be `null` (clears), not `''` (rejected 422) and not an omitted key (no-op that preserves the old value). CREATE, by contrast, omits absent optional fields entirely.
- `dialogInputs` relies on **positional order** of `<input>` elements inside the dialog. Any change to field order or to a field's element type (e.g., swapping `v-text-field` for `v-autocomplete`) can silently shift indices. The `V_COUNTRY_SELECT_STUB` is an `<input>` on purpose to preserve this ordering.
- `VDialog` is stubbed to a bare `<div>` with a slot pass-through; the test does not exercise Vuetify's overlay/teleport machinery.
- `loadLocale('en')` is awaited in `beforeEach` to ensure i18n translations are available before the component renders.
