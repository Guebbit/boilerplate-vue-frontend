---
source: src/modules/account/tests/address-form-dialog.spec.ts
sha256: 4374fcb9bda90ef6d9e731b1ef62b1c1f0be8be79b30cb107496552133002e56
signature: 59fb2d2559dc69e8898f2436762d6c55353433090bcc78673fd069782aadbc39
generated_at: 2026-11-10T03:29:15.018282+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/address-form-dialog.spec.ts

## Purpose

Unit-test suite for the country `v-autocomplete` inside `AddressFormDialog.vue`. It asserts the `items` array the component hands to `VAutocomplete` under three scenarios (unrestricted, narrowed by `shipToCountries`, and i18n labels) — a scope explicitly carved out because neither `ProfileAddresses.vue` nor `AddressPicker.vue`'s own suites cover it.

## Key elements

- **`CountryOption`** — local interface (`{ value: string; title: string }`) describing the shape of each option `VAutocomplete` receives.
- **`mountDialog(props?)`** — helper that mounts `AddressFormDialog` with `modelValue: true`, Vuetify + i18n plugins, and a `VDialog` stub that renders its default slot unconditionally. Accepts an optional `shipToCountries` prop.
- **`countryOptions(wrapper)`** — helper that retrieves the `items` prop from the real `VAutocomplete` instance inside the mounted tree, cast to `CountryOption[]`.
- **`describe('AddressFormDialog — country select')`** — three tests:
  - Unrestricted account: options length equals `ISO_COUNTRY_CODES.length` and includes sample codes (`IT`, `US`, `GB`).
  - Narrowed checkout: passing `shipToCountries: ['IT','FR']` yields exactly those two, verified with `toSorted()`.
  - Localization: each option's `title` matches `Intl.DisplayNames(['en'], { type: 'region' }).of(code)`.

## Relationships

- **`src/modules/account/components/AddressFormDialog.vue`** — the SUT; this spec mounts it and inspects its internal `VAutocomplete` binding.
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()`, called at module scope to register test-environment module wiring before any `mount` call.

## Notes

- Follows the "assert what was passed down" idiom (also used in `stock-movement-form.spec.ts`): it reads the `items` prop directly rather than opening the overlay/menu, avoiding fragile Vuetify overlay interaction.
- `VDialog` is stubbed with a pass-through slot template so the dialog body renders without animation or focus management.
- The spec imports `ISO_COUNTRY_CODES` from `@/infrastructure/utils/country-codes.ts` as the source-of-truth length assertion; adding a code there will change the expected count here.
- `beforeEach` resets Pinia and loads the `en` locale, so `Intl.DisplayNames` assertions are deterministic.
