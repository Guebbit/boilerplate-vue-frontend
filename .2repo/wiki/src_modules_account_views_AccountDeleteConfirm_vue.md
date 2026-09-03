# src/modules/account/views/AccountDeleteConfirm.vue

## Purpose
Public, unauthenticated confirmation page for irreversible account deletion. The one-time token delivered via email link is the sole credential, so the route requires no auth guard and a signed-out visitor can complete the deletion.

## Key elements
- **`submitForm`** – Validates the token (via `useStructureFormValidation`), then calls `confirmAccountDelete` from the profile store. On success, shows a toast and navigates to `Home`. On failure, maps server errors onto fields or falls back to a toast.
- **`useStructureFormValidation`** – Wraps a single-field form (`token`) with a Zod schema, wires up `revalidateOn: locale`, Vuetify invalid-field selector, and an `onInvalid` notification hook.
- **`AccountDeleteConfirmForm`** – Local interface defining the form shape: `{ token?: string }`, prefilled from `route.query.token`.
- **`applyServerErrors` / `notifyErrorMessages`** – Error-resolution pair: first tries to map a rejected API response onto the specific field; if that doesn't match, surfaces a generic toast via the notifications store.
- **`routerLinkI18n`** – Builds locale-aware route paths used for the "Go back" link and the post-delete navigation.

## Relationships
- **`src/infrastructure/utils/logger.ts`** – Listed as a graph neighbor, but this file does not import or reference it directly. Any logging likely occurs downstream in `useProfileStore.confirmAccountDelete` or within the toolkit utilities.

## Notes
- The form carries `novalidate` and relies entirely on the Zod + toolkit validation pipeline; browser-native validation is bypassed.
- The `.then(() => undefined)` after `router.push` intentionally discards the `NavigationFailure | undefined` return so it doesn't leak into the `Promise<void>` chain that `handleSubmit` expects. A failed navigation is left to the router's own error handling.
- Token is read from the query string at setup time; the field is editable in the template, allowing a user to re-enter a token if the prefilled one is rejected.
- The page uses `LayoutDefault` with `id="account-delete-confirm-page"`—convention for anchor/scroll targets in this codebase.
