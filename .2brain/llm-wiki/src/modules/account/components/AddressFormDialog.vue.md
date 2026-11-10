---
source: src/modules/account/components/AddressFormDialog.vue
sha256: a74d60cf4aff210ba5bc12e88c2cc58cce5b4af857f289d8ca95fd58484023d1
signature: 66c7c5c8314dd2a032339bc15d96d018b7a6e246d6f8fd552d3a7ea5cc81065a
generated_at: 2026-11-10T03:18:25.441278+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/AddressFormDialog.vue

## Purpose

A reusable add/edit address dialog extracted from `ProfileAddresses.vue` so that `AddressPicker.vue` (the checkout flow) can offer the same "add an address" experience without duplicating the form fields, validation schema, or save logic. It validates via a shared Zod schema, dispatches to the addresses store, and keeps the user in-place on failure.

## Key elements

- **`open` (defineModel\<boolean\>)** — two-way dialog visibility; the single entry point for open/close.
- **`editing?: Address` prop** — the record to prefill; `undefined` signals "add new". Only read on open (via the `open` watcher), not reactively.
- **`shipToCountries?: string[]` prop** — narrows the country dropdown (checkout passes the deployment's list; profile page omits it for the full ISO 3166-1 set).
- **`countryOptions` (computed)** — maps codes to localized labels and sorts by `localeCompare` in the active locale.
- **`offerSetAsDefault` (computed)** — shows the "set as default" checkbox only when adding (not editing) *and* the address book already has ≥ 1 entry.
- **`emptyForm()` / `formFrom(address)`** — build the flat `AddressForm` object (all strings, optionals as `''`) for blank or prefilled states.
- **`useStructureFormValidation`** — wires `addressSchema` to a reactive form object, exposes `showFormErrors`, `applyServerErrors`, and `handleSubmit`. Revalidates on locale change.
- **`handleSave`** — dispatches `updateAddress` (PATCH, diffed via `toRequestBody`) or `addAddress` (POST). On success: toast + close. On failure: field-level errors mapped to fields, or a dialog-level blocking error via `useBlockingError`.
- **`watch(open, …)`** — resets form, clears the set-as-default tick, and clears any prior save error each time the dialog opens.

## Relationships

- **`src/modules/account/stores/addresses.ts`** — imported for `addAddress`, `updateAddress` actions and the reactive `addresses` list + `loading` flag (drives the save-button spinner).
- **`src/modules/account/schemas.ts`** — provides `addressSchema`, the Zod schema driving client-side validation.
- **`src/modules/account/components/ProfileAddresses.vue`** (caller) — opens this dialog for the profile-page address book; never passes `shipToCountries`, so the full country list is shown.
- **`src/modules/account/components/AddressPicker.vue`** (caller) — opens this dialog at checkout; passes `shipToCountries` to restrict the country select to the deployment's delivery countries.
- **`src/modules/account/tests/address-form-dialog.spec.ts`** — unit/integration tests for this component.

## Notes

- **`default` flag is send-only-`true`.** The backend ignores `default: false`; demoting an entry is done by promoting a different one. The checkbox therefore never *unsets* a default.
- **PATCH semantics via `toRequestBody`.** On update, a field the user cleared is serialized as explicit `null`; on add it is simply omitted. This is a deliberate difference the caller should not override.
- **Country select uses `v-autocomplete`, not `v-select`.** ~249 options are unusable without type-to-filter.
- **Save failure keeps the dialog open.** `useBlockingError` renders an `InlineErrorAlert` inside the dialog; the user re-submits in place rather than being kicked to a toast-and-close pattern.
- **Component `name` lives in a separate `<script>` block** because `<script setup>` cannot declare `name`; it is needed for `<KeepAlive>` / devtools identification.
- **`editing` is read once per open.** Neither caller mutates `editing` while the dialog is open, so the component does not watch it reactively.
