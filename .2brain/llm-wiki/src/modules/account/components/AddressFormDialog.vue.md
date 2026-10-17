---
source: src/modules/account/components/AddressFormDialog.vue
sha256: 61472e616c755eb3f2ebdff7e5a3c9d20c57a15c8de90aea5c8959a6490ab2b9
generated_at: 2026-10-17T00:14:34.411462+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/AddressFormDialog.vue

## Purpose

Reusable add/edit address dialog, extracted from `ProfileAddresses.vue` so that both the profile page and the checkout `AddressPicker` share a single implementation of the form, its Zod schema, and its save logic instead of maintaining two copies.

## Key elements

- **`open`** (`defineModel<boolean>`) — v-model controlling dialog visibility; both callers toggle it.
- **`editing`** (prop, `Address | undefined`) — prefill source for edit mode; absent means "add new".
- **`shipToCountries`** (prop, `string[] | undefined`) — optionally narrows the country `<select>`; `AddressPicker` passes the shop's ship-to list, `ProfileAddresses` does not.
- **`AddressForm`** (interface) — the seven flat string fields (`label`, `fullName`, `street`, `city`, `zip`, `country`, `phone`).
- **`emptyForm()` / `formFrom(address)`** — build the initial form state (blank or prefilled).
- **`countryOptions`** (computed) — ISO 3166-1 codes (or the `shipToCountries` subset) mapped to localized, locale-sorted labels.
- **`addressSchema`** (Zod) — validation contract; `label` and `phone` are unconstrained, the rest require ≥ 1 char. Messages are thunks for locale reactivity.
- **`useStructureFormValidation`** — wires `form`, `formErrors`, `showFormErrors`, `handleSubmit`, `setForm`, `applyServerErrors`; revalidates on locale change.
- **`useBlockingError`** — dialog-level save-error state; keeps the dialog open on failure.
- **`handleSave`** — routes to `addAddress` or `updateAddress` via the Pinia store; uses `toRequestBody` for PATCH semantics; toasts on success, maps server field errors in place, or blocks the dialog.
- **`offerSetAsDefault` / `setAsDefaultOnAdd`** — add-only "set as default" checkbox; hidden on first entry and on edit.
- **`useFullscreenDialog` / `useReturnFocus`** — responsive fullscreen behavior and focus restoration on close.

## Relationships

- **`ProfileAddresses.vue`** — primary caller; renders this dialog for the user's address book. Previously owned the form inline before extraction.
- **`AddressPicker.vue`** — checkout-side caller; passes `shipToCountries` to restrict the country list to the deployment's deliverable set.
- **`stores/addresses.ts`** — Pinia store the dialog reads (`addresses`, `loading` via `storeToRefs`) and writes to (`addAddress`, `updateAddress`).
- **`tests/address-form-dialog.spec.ts`** — unit/integration tests for this component.

## Notes

- The `default` flag is **only ever sent as `true`** on add; the backend ignores `false`, and demotion is done exclusively by promoting a *different* entry.
- `toRequestBody` encodes PATCH semantics: on update, a field the user cleared is sent as explicit `null`; an omitted field means "unchanged". On add there is no prior value, so cleared optionals are simply omitted.
- `editing` is read **only when the dialog opens** (the `open` watcher resets the form). Neither caller mutates it while the dialog is open.
- Country select uses `v-autocomplete` (not `v-select`) because ~249 options is impractical to scroll without a type-to-filter. The `autocomplete` HTML attribute is `"country"` (code token) rather than `"country-name"` (free text), matching the ISO-code data shape.
- The form element carries `novalidate`; all validation is handled by the toolkit composable and Vuetify error slots.
- The `label` field has no minimum-length constraint — it is purely optional, unlike the other four required fields.
