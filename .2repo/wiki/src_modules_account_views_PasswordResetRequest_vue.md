# src/modules/account/views/PasswordResetRequest.vue

## Purpose
Public "request password reset" page. The user enters an email address; the backend is asked to issue a reset token. The UI always displays the same success acknowledgement whether or not the account exists, preventing username enumeration.

## Key elements
- **`submitForm`** – Entry point for the form's `@submit.prevent`. Delegates to `handleSubmit` (from `useStructureFormValidation`), which runs validation, then calls `useAuthStore().requestPasswordReset(email)`. On success a toast is shown; on failure, server errors are mapped to the offending field or surfaced as a toast.
- **`useStructureFormValidation`** – Toolkit composable that owns `form`, `formErrors`, `showErrors`, `isSubmitting`, `handleSubmit`, and `applyServerErrors`. Configured with `usersSchema.pick({ email: true })`, `novalidate`-aware DOM targeting via `VUETFY_INVALID_FIELD_SELECTOR`, and `revalidateOn: locale` so re-validation fires on language switch.
- **`applyServerErrors` / `notifyErrorMessages`** – Error-landing utilities: server-named field errors are applied to the form; anything unresolvable falls through to a generic toast.
- **Template** – `LayoutDefault` wrapper → single `v-card` containing one email `v-text-field`, a submit `v-btn` with loading state, and a text button linking to the `Login` route via `routerLinkI18n`.

## Relationships
- **`src/infrastructure/utils/logger.ts`** – Appears in the dependency graph but is not directly imported in this file; likely reached indirectly through `@/infrastructure/utils/errors.ts` or the auth store's API layer.

## Notes
- **Enumeration safety is a tested contract.** The JSDoc references an e2e assertion that the response is identical for existing vs. non-existing accounts. Do not branch the success UI on whether the account was found.
- The `<form>` carries `novalidate`, so all validation is handled by the toolkit composable, not the browser.
- `form.value.email!` uses a non-null assertion; this is safe only because `handleSubmit` guarantees validation passed before the inner callback executes.
- Re-validation on `locale` change means switching language mid-form re-runs the schema and may surface new error messages.
