# src/modules/account/views/VerifyEmailConfirm.vue

## Purpose

Public, unauthenticated email-verification confirm page. The visitor follows a link from their email, enters the one-time token into a form, and submits it to activate their account. A submit button (rather than an auto-fire on mount) is used deliberately so that mail-client link prefetchers cannot spend the token before the human actually clicks.

## Key elements

- **`VerifyEmailConfirmPage`** – default export (name-only) identifying the component.
- **`VerifyEmailConfirmForm`** – interface describing the form shape (`token?: string`).
- **`form` / `formErrors` / `showFormErrors` / `isSubmitting` / `handleSubmit`** – returned by `useStructureFormValidation` (from `@guebbit/vue-toolkit`), wrapping a Zod schema that requires a non-empty token string. Revalidation is bound to the active `locale`.
- **`submitForm`** – calls `confirmEmailVerification` from `useProfileStore` with the token; on success shows a toast and navigates to the `Home` route via `routerLinkI18n`; on failure delegates to `notifyErrorMessages`.
- **Template** – a single `v-card` inside `LayoutDefault` containing one `v-text-field` (bound to `form.token`) and one `v-btn` submit. Both carry `data-test` attributes (`verify-token`, `verify-submit`).

## Relationships

- **`src/infrastructure/utils/logger.ts`** – listed as a graph neighbor but no direct import or call is visible in this file. Interaction (if any) is transitive (e.g. through `useProfileStore` or the `vue-toolkit` form helper).

## Notes

- The token is **pre-populated** from `route.query.token` if present, but the user can still edit the field before submitting. The Zod schema only enforces non-empty; there is no server-side shape validation here.
- `handleSubmit` wraps the async store call; the extra `.then(() => undefined)` intentionally discards `router.push`'s return value so that navigation errors are handled by the router's own `onError`, not swallowed by the form's `.catch`.
- On success the user is routed to `Home`, not to a profile page directly — the profile page's banner (or lack thereof) reflects verification state.
- The `revalidateOn: locale` option means validation messages re-render when the user switches language.
- This page is intentionally **public** (no auth guard); the token in the form *is* the credential, mirroring the password-reset confirm pattern.
