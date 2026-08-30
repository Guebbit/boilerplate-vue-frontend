# src/modules/account/views/PasswordResetConfirm.vue

## Purpose

The "confirm" step of the password-reset flow. The user arrives via an emailed link carrying a one-time token as a route query parameter, enters a new password and confirmation, and on valid submission the token is exchanged for the new credential through the auth store.

## Key elements

- **`PasswordResetConfirmForm`** — interface for the form state: `token`, `password`, `passwordConfirm`.
- **Zod schema (inline)** — validates token (non-empty), password (delegates to `usersPasswordSchema`), passwordConfirm (min 8 chars), and a top-level `.refine` ensuring `password === passwordConfirm`.
- **`useAppForm<PasswordResetConfirmForm>`** — composable that owns form state, per-field error display, submit locking, and server-error application.
- **`submitForm`** — orchestrates: zod validation → `confirmPasswordReset` → success toast + redirect to `Login`; on API failure, maps error fields via `applyServerErrors` or falls back to a generic toast via `notifyErrorMessages`.
- **Template** — a `v-card` containing three `v-text-field` inputs (token, password, confirm), a submit button, and a "back to login" link.

## Relationships

- **`src/infrastructure/utils/logger.ts`** (listed graph neighbor): no direct import or usage is visible in this file.

## Notes

- The trailing `.then(() => undefined)` after `router.push` is deliberate: it discards the `NavigationFailure | undefined` return so the promise chain resolves to `void`, matching the submit-handler contract. A navigation failure is the router's `onError` responsibility, not this form's.
- `usersPasswordSchema` is imported from `@/modules/users`, keeping password-strength rules defined in one place and shared across forms.
- The token field is editable in the template (not read-only); the initial value comes from `route.query.token`, but the user can type or modify it before submitting.
- Both password fields use `autocomplete="new-password"` to signal browsers to treat these as new credentials, not a saved login.
