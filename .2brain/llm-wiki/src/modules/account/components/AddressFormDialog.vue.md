---
source: src/modules/account/components/AddressFormDialog.vue
sha256: 3dcb0bcf5bda8820516cd70d77d90120c5fcd20a2ff82cca959c7b958df5e4ab
generated_at: 2026-10-02T14:44:01.684865+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/AddressFormDialog.vue

## Purpose

A shared add/edit address dialog form, extracted from `ProfileAddresses.vue` so that `AddressPicker.vue` (the checkout side) can offer the same "add an address" flow without duplicating the form fields, Zod schema, or save logic. It handles both creating a new address and updating an existing one, with a dialog-level blocking error for save failures.

## Key elements

- **`AddressForm` interface / `emptyForm()` / `formFrom()`** — The seven form fields (label, fullName, street, city, zip, country, phone) and helpers to blank or prefill them from an `Address` entry.
- **`countryOptions` (computed)** — Localized, locale-sorted country list. Uses `shipToCountries` prop when provided (checkout), otherwise the full `ISO_COUNTRY_CODES` set.
- **`addressSchema` (Zod)** — Requires non-empty fullName, street, city, zip, country; label and phone are optional. Error messages are thunks resolved in the active locale.
- **`useStructureFormValidation`** — Wires the schema to Vuetify's invalid-field selector; revalidates on locale change; no `formElement` because the dialog already traps focus.
- **`useBlockingError`** — Dialog-local save-failure state; the dialog stays open for a retry rather than closing.
- **`handleSave`** — Dispatches `addAddress` or `updateAddress` via the addresses store. Uses `toRequestBody` to serialize; on add, sends `default: true` only when the checkbox is ticked (never `false`). On failure, maps server errors to fields or blocks the dialog.
- **`watch(open)`** — Resets the form to `editing` (or blank), clears the default checkbox and any prior save error each time the dialog opens.
- **`useFullscreenDialog` / `useReturnFocus`** — Responsive fullscreen on small screens; restores focus to the triggering control on close.
- **`offerSetAsDefault` (computed)** — Shows the "set as default" checkbox only when adding (not editing) and at least one address already exists.

## Relationships

- **`ProfileAddresses.vue`** — The original parent this dialog was extracted from. Opens the dialog for edit and add in the user's address book; never passes `shipToCountries`, so the full country list is always available.
- **`AddressPicker.vue`** — The checkout-side caller. Opens the dialog with `shipToCountries` (the deployment's ship-to list) to restrict the country select per the Geo-blocking Regulation (E12).

## Notes

- `editing` is read **only** when the dialog opens (via the `open` watcher); it is not reactive while the dialog is open. Neither caller toggles it live.
- `setAsDefaultOnAdd` only ever transmits `true`. The backend ignores `false`, and demotion is done by making a *different* entry the default.
- `toRequestBody` gives cleared optional fields different semantics: omitted on add (no prior value), explicit `null` on update (PATCH merge diffed against the original).
- The country field uses `v-autocomplete` (not `v-select`) because ~249 options are unusable without type-to-filter. `autocomplete="country"` (not `country-name`) is the correct token for browser address autofill with ISO alpha-2 codes.
- Save failures that name a specific field are mapped to that field's error messages; anything else triggers the dialog-level `InlineErrorAlert` and keeps the dialog open.
