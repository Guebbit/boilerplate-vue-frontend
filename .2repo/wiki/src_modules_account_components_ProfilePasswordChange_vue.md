# src/modules/account/components/ProfilePasswordChange.vue

## Purpose

A collapsible password-change form embedded in the profile page. It proves the current password on the server (no email round-trip, unlike the reset flow) and is hidden behind a toggle so the profile page doesn't open with all three forms visible at once.

## Key elements

- **`showChangePassword` (ref)** — boolean gate controlling form visibility; also drives `aria-expanded` on the toggle button.
- **Zod schema (inline)** — validates `currentPassword` (non-empty), `password` (via shared `usersPasswordSchema`), and `passwordConfirm` (non-empty). A `superRefine` enforces `passwordConfirm === password` and attaches a localized error to the `passwordConfirm` path.
- **`useStructureFormValidation`** — wires the schema into reactive form state (`passwordForm`), field-level errors (`passwordErrors`), an error-visibility flag (`showPasswordErrors`), and a `handleSubmit` gate that focuses the first invalid field before allowing the API call. Re-validates when `locale` changes.
- **`submitPasswordChange`** — calls `handleSubmit`, which on valid input delegates to `useProfileStore().changePassword(currentPassword, password, passwordConfirm)`. On success: clears all three fields, fires a success toast, collapses the form. On failure: routes the error through `notifyErrorMessages`.
- **`passwordFormElement` (ref)** — bound to the `<form>` so the validation hook can focus the first invalid field on submit.
- **`passwordFormId`** — generated via `useId()` for the toggle's `aria-controls` attribute.

## Relationships

- **`@/modules/account/stores/profile.ts`** — calls `changePassword` from `useProfileStore` to perform the actual API request.
- **`@/modules/users`** — imports `usersPasswordSchema` so the new-password rules (length, complexity, etc.) stay in one place.
- **`@/infrastructure/utils/errors.ts`** — imports `notifyErrorMessages` (toast formatting) and `VUETIFY_INVALID_FIELD_SELECTOR` (used by the validation hook to focus the first invalid Vuetify field).
- **`@guebbit/vue-toolkit`** — provides `useStructureFormValidation` (form validation lifecycle) and `useNotificationsStore` (toast messages).
- **`src/infrastructure/utils/logger.ts`** — listed as a graph neighbor but not directly imported or referenced in this file; no visible interaction.

## Notes

- The `superRefine` calls `t()` at parse time; because `zod` invokes it lazily on each `.parse()` call, the i18n translation is always current without needing a thunk — a deliberate choice documented in the comment.
- The form uses `v-show` (not `v-if`) inside `<v-expand-transition>`, so the DOM nodes persist and Vuetify's transition animation works both ways.
- `autocomplete` attributes are set to `current-password` / `new-password` per HTML spec expectations for password managers.
- The component is a single default export with no props or emits; it is purely self-contained state within the profile page.
