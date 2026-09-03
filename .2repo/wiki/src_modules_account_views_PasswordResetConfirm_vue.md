# src/modules/account/views/PasswordResetConfirm.vue

## Purpose
Public-facing page that completes a password reset using a one-time token delivered by email. It validates the token and two matching passwords with a zod schema, calls the auth store to persist the new password, and redirects the user to the Login route on success.

## Key elements
- **`PasswordResetConfirmForm`** – local interface for the three form fields (`token`, `password`, `passwordConfirm`).
- **zod schema + `.refine`** – validates `token` (non-empty), `password` (via shared `usersPasswordSchema`), `passwordConfirm` (min 8 chars), and cross-checks that both password fields are identical.
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) – wraps the schema into reactive `form`, `formErrors`, `handleSubmit`, `applyServerErrors`, and submission-lifecycle state; revalidates on locale change.
- **`submitForm`** – orchestrates the flow: validate → `confirmPasswordReset(token, password, passwordConfirm)` → success toast + `router.push(Login)`, or map server errors to fields / show a generic toast.
- **`routerLinkI18n`** – builds i18n-aware route paths for navigation links.

## Relationships
- **`src/infrastructure/utils/logger.ts`** – no direct import in this file. Indirect coupling is possible through `@/infrastructure/utils/errors.ts` (`notifyErrorMessages`), which the page imports for error-to-toast rendering.

## Notes
- The token is prefilled from `route.query.token` but remains an editable field in the UI.
- The explicit `.then(() => undefined)` after `router.push` discards the `NavigationFailure | undefined` return so the promise chain stays `Promise<void>`; navigation failures are the router's responsibility, not the form's.
- `revalidateOn: locale` causes the zod schema (and its i18n error strings) to re-evaluate whenever the active locale changes.
- `applyServerErrors` is attempted first on API failure; only if it returns `false` does the fallback `notifyErrorMessages` toast fire.
