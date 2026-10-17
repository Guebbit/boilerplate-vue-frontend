---
source: src/modules/account/tests/address-form-dialog.spec.ts
sha256: 4374fcb9bda90ef6d9e731b1ef62b1c1f0be8be79b30cb107496552133002e56
generated_at: 2026-10-17T00:20:10.189823+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/address-form-dialog.spec.ts

## Purpose

Unit test suite for the country `v-autocomplete` inside `AddressFormDialog.vue`. It verifies the options list that gets passed down to `VAutocomplete` (full ISO list vs. narrowed ship-to list) and that labels are localized via `Intl.DisplayNames`. It exists to fill a gap not covered by `ProfileAddresses.vue` or `AddressPicker.vue`'s own suites.

## Key elements

- **`CountryOption`** — local interface (`value`, `title`) describing one autocomplete option as received by `VAutocomplete`.
- **`mountDialog(props?)`** — helper that mounts `AddressFormDialog` with `modelValue: true`, stubs `VDialog` to render its slot directly, and registers `vuetify` + `i18n` plugins.
- **`countryOptions(wrapper)`** — extracts the `items` prop from the real `VAutocomplete` child component, bypassing any overlay/menu interaction.
- **`describe('AddressFormDialog — country select')`** — three tests: (1) full `ISO_COUNTRY_CODES` list when no `shipToCountries` prop is given, (2) list narrowed to a supplied `shipToCountries` array, (3) each `title` matches `Intl.DisplayNames` output.
- **`beforeEach`** — resets Pinia and loads the `'en'` locale before every test.

## Relationships

- **`src/modules/account/components/AddressFormDialog.vue`** — the component under test; mounted here with various prop combinations.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()`, called at module scope to register shared module stubs before any test runs.

## Notes

- The suite deliberately asserts on `VAutocomplete`'s `items` prop rather than opening the overlay, following the same idiom documented in `stock-movement-form.spec.ts`. This avoids needing a real Vuetify menu interaction.
- `VDialog` is stubbed with a minimal `<div><slot /></div>` template so the dialog content renders synchronously without animation or overlay logic.
- The doc comment explicitly scopes this file: it tests only the country select's rendered options, not the full form validation or submission flow covered elsewhere.
