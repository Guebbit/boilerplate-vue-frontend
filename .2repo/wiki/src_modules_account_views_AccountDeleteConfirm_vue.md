# src/modules/account/views/AccountDeleteConfirm.vue

## Purpose

A standalone confirmation page that lets a signed-out visitor permanently delete their account by entering (or confirming) the one-time token delivered via email link. Because the token in the URL is itself the credential, the route requires no auth guard.

## Key elements

- **`submitForm`** – Validates the token via `useAppForm` + Zod, then calls `confirmAccountDelete` from the profile store. On success shows a toast and navigates to `Home`; on API failure maps server errors back onto the field or falls through to `notifyErrorMessages`.
- **`AccountDeleteConfirmForm`** – Interface for the single-field form (`token?: string`), prefilled from `route.query.token`.
- **`useAppForm`** (from `@/infrastructure/composables/use-app-form.ts`) – Handles validation state, `isSubmitting`, and `applyServerErrors` for this page.
- **`confirmAccountDelete`** (from `@/modules/account/stores/profile.ts`) – The store action that performs the irreversible deletion API call.
- **`routerLinkI18n`** – Produces locale-aware route paths for the "Go back" and post-success navigation links.
- **`notifyErrorMessages`** – Generic error-to-toast helper used as the fallback when `applyServerErrors` cannot map the error to a field.

## Relationships

- **`src/infrastructure/utils/logger.ts`** – Transitive dependency; not imported directly here but reached through the `errors.ts` utilities or the profile store's internal error-handling path.

## Notes

- The `.then(() => undefined)` after `router.push` is intentional: it swallows Vue Router's `NavigationFailure | undefined` resolution so the outer `Promise<void>` contract of `handleSubmit` is satisfied and failed navigations are left to the router's own error reporting rather than surfaced as a form error.
- The token is read from `route.query` at setup time and written into the form model; there is no separate "paste the token" flow—pre-filling is the only input path.
- The component name is `AccountDeleteConfirmPage` (set in the options block) while the file is `AccountDeleteConfirm.vue`; the route name referenced for i18n links is `account-delete-confirm-page`.
