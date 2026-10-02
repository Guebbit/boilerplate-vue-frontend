---
source: src/modules/account/views/VerifyEmailConfirm.vue
sha256: 616170532ec7112dde7a5865c5bdd4fde6ec43025dca740e4663c3b42d1e7b5f
generated_at: 2026-10-02T12:40:15.859008+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/VerifyEmailConfirm.vue

## Purpose

Public, unauthenticated page that confirms an email address using a one-time token delivered by link. The token in the query string is the sole credential; the page requires an explicit button press (not an auto-fire on mount) so that mail-client prefetching or link-scanning cannot consume the token before the user intends to.

## Key elements

- **`VerifyEmailConfirmForm`** – interface defining the single field (`token`) that the form validates.
- **`form` / `formErrors` / `showFormErrors` / `isSubmitting` / `handleSubmit`** – destructured from `useStructureFormValidation` (from `@guebbit/vue-toolkit`); the Zod schema requires a non-empty token string.
- **`confirmEmailVerification`** – action from `useProfileStore` that spends the token server-side.
- **`submitForm`** – clears any prior blocking error, runs the validated submit, shows a success toast on completion, and navigates to the `Home` route via `routerLinkI18n`.
- **`useClearQueryOnMount(route, router)`** – strips the `token` query param from the URL and history immediately after mount so it does not propagate to analytics (Umami, Faro) or linger in browser history.
- **`useBlockingError()`** – surfaces a token-specific failure (spent/unknown) as an inline alert (`InlineErrorAlert`) next to the submit button rather than a generic toast.
- **`InlineErrorAlert`** – template component rendering the blocking error.

## Relationships

- **`src/modules/account/views/TwoFactorChallenge.vue`** – sibling confirm page (password-reset / 2FA). This file's comments explicitly mirror its conventions: public-by-design (no auth required), submit-button-gated to prevent token/scanner spend, and the same "swallow `router.push` result" note. No code import; the relationship is a shared pattern and copy-paste lineage.
- **`src/infrastructure/utils/logger.ts`** – listed as a graph neighbor but not directly imported or invoked in this file; any logging is delegated to `useProfileStore` or the toolkit internally.

## Notes

- The token is read from `route.query.token` at setup time and seeded into the form; after mount the query param is cleared, so a page refresh will present an empty token field.
- `handleSubmit` returns a Promise; the `.then(() => undefined)` chain intentionally discards the router's resolved value so that a navigation failure is handled by the router's own `onError`, not caught here as a form error.
- The `revalidateOn: locale` option means switching locale mid-session re-runs validation messages (e.g., the "token required" error string).
- `data-test` attributes (`verify-token`, `verify-submit`, `verify-email-confirm-error`) are the stable selectors for E2E tests.
