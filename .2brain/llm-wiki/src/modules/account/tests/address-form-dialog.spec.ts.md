---
source: src/modules/account/tests/address-form-dialog.spec.ts
sha256: d9d98591651290d1c086cb4e8bf2a6cae695c56b003e223b870814f06910f92f
generated_at: 2026-10-02T12:19:28.331760+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/address-form-dialog.spec.ts

## Purpose

Unit tests for the country `<v-autocomplete>` inside `AddressFormDialog.vue`. Covers the two states the dialog can be in — unrestricted (address book) and narrowed to a `shipToCountries` list (checkout) — plus label localization. Deliberately asserts the `items` prop handed to `VAutocomplete` rather than simulating overlay/menu interaction, matching the idiom used in `stock-movement-form.spec.ts`.

## Key elements

- **`mountDialog(props?)`** – Mounts `AddressFormDialog` with `modelValue: true` and a `VDialog` stub that renders its slot unconditionally, so the inner form is inspectable without dialog open/close mechanics.
- **`countryOptions(wrapper)`** – Grabs the first `VAutocomplete` by component name and returns its `items` prop as `CountryOption[]` (`{ value, title }`).
- **`CountryOption`** – Interface describing one entry in the autocomplete list.
- **Three `it` blocks** under `describe('AddressFormDialog — country select')`:
  1. Full ISO 3166-1 list is offered when no `shipToCountries` prop is passed.
  2. List is narrowed to exactly the given codes (e.g. `['FR', 'IT']`).
  3. Each option's `title` matches `Intl.DisplayNames` output for the current locale.
- **`beforeEach`** – Resets Pinia and loads the `en` locale before each test.

## Relationships

- **`tests/support/unit/wire-modules.ts`** – Imported as `wireModulesIntoCore`; called once at module scope (before any test) to register application modules (Pinia stores, DI bindings, etc.) into the Vitest environment so `AddressFormDialog` can resolve its dependencies.
- **`AddressFormDialog.vue`** – The component under test; the suite only exercises its country-select branch.
- **`ISO_COUNTRY_CODES`** (infrastructure) – Source of truth for the unrestricted option list; the unrestricted test asserts `options.length === ISO_COUNTRY_CODES.length`.

## Notes

- The `VDialog` stub (`<div><slot /></div>`) is the same pattern as `profile-addresses-default.spec.ts`; without it the form content would never render because Vuetify's dialog hides content until opened.
- `wireModulesIntoCore()` is a side-effect call at the top of the module — it must run before `mountDialog` is ever invoked, not inside a `beforeEach`.
- The narrowing test sorts the expected array (`.toSorted()`) because the component does not guarantee insertion order of the filtered list.
- E12 is a feature/story identifier for the ship-to-country narrowing behavior; it appears in comments to link the test back to the requirement.
