# src/modules/account/components/ProfileAddresses.vue

## Purpose

Vue 3 single-file component that renders the user's address-book panel within the account/profile section. It provides full CRUD on saved addresses (add, edit, remove, set default) via a dialog form, pulling all state and actions from a Pinia store so the list re-renders from the server's full response after every write.

## Key elements

- **`AddressForm` interface** – flat shape of the dialog's fields (label, fullName, street, city, zip, country, phone); all strings, optionals represented as empty strings.
- **`emptyForm()`** – returns a blank `AddressForm`; also used to reset the form when opening "add".
- **`addressSchema` (Zod)** – validation contract requiring five non-empty fields (fullName, street, city, zip, country); error messages are i18n thunks so they resolve in the active locale.
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) – wires the schema into Vuetify's `v-text-field` error slots via `formErrors` / `showFormErrors`; revalidates on locale change.
- **`openAdd` / `openEdit`** – set `editingId` and `form`, then open the dialog.
- **`handleSave`** – dispatches `addAddress` or `updateAddress` based on `editingId`; drops empty optional fields (`label`, `phone`) before sending; toasts success or errors.
- **`handleMakeDefault`** – calls `updateAddress(id, { default: true })`; relies on the store's fetch-after-write to re-render the list with the new default.
- **`handleRemove`** – shows a confirmation via `useDialogStore().confirm(…)` then calls `removeAddress`.
- **`mobile`** (from Vuetify `useDisplay`) – switches the dialog to `fullscreen` on phone-sized viewports.
- **`dialogTitleId`** (from Vue `useId`) – gives the dialog heading a stable `id` for `aria-labelledby`.

## Relationships

- **`src/infrastructure/utils/logger.ts`** – not imported directly by this component. It is likely pulled in transitively by `useAddressesStore` or the `@/infrastructure/utils/errors.ts` helpers (`notifyErrorMessages`) that this component calls on API failure.

## Notes

- Every write (add / update / remove / make-default) depends on the store re-fetching the full list; the component does **not** optimistically update local state. The "exactly one default" invariant is a property of the returned list, not of the single entry touched.
- `label` and `phone` are optional in the API contract; the form represents them as empty strings and strips them (`|| undefined`) before sending to avoid persisting `""`.
- The form has no `formElement` option passed to `useStructureFormValidation` because the dialog already traps focus; `revealErrors` is treated as a state change, not a focus move.
- All user-facing strings go through `t()`; validation messages are thunks (`() => t(…)`) to support runtime locale switches without re-creation.
- The file content is truncated in this view; the Vuetify form fields for the remaining inputs (zip, country, phone) and the dialog's action buttons are below the cutoff.
