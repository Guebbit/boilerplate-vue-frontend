# src/modules/account/components/ProfileAddresses.vue

## Purpose

Address-book panel for the account profile page. Renders the user's saved addresses as a card grid and provides add, edit, remove, and set-default operations through a modal dialog and inline actions. Every mutating action re-fetches the full address list from the API so the "exactly one default" invariant is always reflected from the server's authoritative state.

## Key elements

- **`AddressForm`** – local interface mirroring `AddressInput` with optional fields as empty strings for form binding.
- **`emptyForm()`** – returns a blank `AddressForm`; used on initial render and as the "add" reset.
- **`addressSchema`** – Zod object schema; required fields (`fullName`, `street`, `city`, `zip`, `country`) have `.min(1)` with thunk-based error messages for i18n.
- **`openAdd()` / `openEdit(address)`** – open the dialog, setting `editingId` (or clearing it) and populating the form.
- **`handleSave()`** – wraps `handleSubmit`; dispatches `addAddress` or `updateAddress`, converts empty optional strings to `undefined`, and reports success/failure via toast.
- **`handleMakeDefault(address)`** – calls `updateAddress(id, { default: true })`; relies on the store's post-write fetch to re-render the list.
- **`handleRemove(address)`** – shows a confirmation dialog (`useDialogStore().confirm`), then calls `removeAddress`.
- **`onMounted(fetchAddresses)`** – initial data load.
- Template uses `v-card` grid, `v-dialog` for the form, `lucide-vue-next` icons, and `data-test` attributes for e2e selectors.

## Relationships

- **`src/infrastructure/utils/logger.ts`** – transitive dependency: the Pinia address store and/or `notifyErrorMessages` (from `@/infrastructure/utils/errors.ts`) log through the shared logger; this component does not import it directly.

## Notes

- **Full-list re-fetch after every write** is deliberate: the single-default constraint is a property of the collection, not of the row that changed, so optimistic per-row updates would be insufficient.
- **Optional fields (`label`, `phone`)** are coerced to `undefined` before sending, never as `""`, to avoid the API treating empty strings as real values.
- **No `formElement`** is passed to `useAppForm` because the surrounding `v-dialog` already traps focus; `revealErrors` is therefore a state toggle, not a focus move.
- **Zod error messages are thunks** (`() => t(key)`) so they resolve against the active locale at validation time, matching the project-wide convention.
- **Accessibility**: the dialog heading gets a `useId()`-generated id referenced by `aria-labelledby`; per-entry action buttons carry templated `aria-label`s (e.g. "Edit *Home*") to disambiguate otherwise identical buttons.
- `data-test` attributes are present on every interactive element and state region for the e2e suite.
