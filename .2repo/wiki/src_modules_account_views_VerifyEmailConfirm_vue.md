# src/modules/account/views/VerifyEmailConfirm.vue

## Purpose
Public (unauthenticated) confirmation page that spends a one-time email-verification token. The token arrived via email and acts as the credential, so the visitor need not be signed in. A submit button is used instead of auto-firing on mount to prevent mail scanners from prefetching the link and consuming the token before the human clicks through.

## Key elements
- **`VerifyEmailConfirmForm`** – Minimal interface describing the form shape (`token?: string`).
- **`useAppForm<VerifyEmailConfirmForm>(…)`** – Wires up the reactive form, Zod validation (`token` must be a non-empty string), and submission state (`isSubmitting`, `handleSubmit`, `showFormErrors`).
- **`submitForm()`** – Calls `confirmEmailVerification(token)` from the profile store; on success pushes a toast and navigates to the `Home` route via `routerLinkI18n`. Errors are surfaced through `notifyErrorMessages`.
- **`confirmEmailVerification`** (from `useProfileStore`) – The actual API call that spends the token.
- **Template** – Single `v-text-field` for the token and a `v-btn` submit, wrapped in `LayoutDefault` with an `id="verify-email-confirm-page"` anchor and `data-test` attributes for E2E selectors.

## Relationships
The only listed graph neighbor (`src/infrastructure/utils/logger.ts`) is **not** imported or referenced in this file. The actual runtime dependencies visible in the source are:

- `useProfileStore` (`@/modules/account/stores/profile.ts`) – provides `confirmEmailVerification`.
- `useAppForm` (`@/infrastructure/composables/use-app-form.ts`) – form lifecycle + validation.
- `notifyErrorMessages` (`@/infrastructure/utils/errors.ts`) – error toast formatting.
- `routerLinkI18n` (`@/infrastructure/i18n/router-link.ts`) – i18n-aware route target builder.
- `useNotificationsStore` (`@guebbit/vue-toolkit`) – success/error toast queue.

## Notes
- **No auth guard:** the page is intentionally public; the token is the sole credential. Do not add a route guard requiring a session.
- **Swallowed navigation result:** the `.then(() => undefined)` after `router.push` is deliberate—navigation errors are the router's own `onError` responsibility, not the form's. A parallel pattern exists in the password-reset confirm page.
- **`novalidate` on `<form>`:** browser validation is suppressed; Zod (via `useAppForm`) is the sole validation layer.
- **`token` pre-filled from `route.query`:** the field is editable, so a user can correct a truncated token from a poorly-wrapping email client before submitting.
