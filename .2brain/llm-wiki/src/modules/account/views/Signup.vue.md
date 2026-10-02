---
source: src/modules/account/views/Signup.vue
sha256: 7faafcedd6e11791895ffefe07aeaa1d7860c02e241aeeacd61ceebe641fe4b9
generated_at: 2026-10-02T12:38:58.151320+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/Signup.vue

## Purpose

The account-creation page. It collects email, password (with confirm), terms acceptance, optional analytics consent, and an optional avatar file; validates them client-side with Zod; calls `POST /account/signup` to register **and** log the user in; then optionally uploads the avatar as a follow-up `PATCH /account` and redirects (honouring `?continue=`). It also surfaces OAuth "sign up with" links alongside the form.

## Key elements

- **`signupSchema`** – Zod schema built from `usersSchema.pick({ email: true })` extended with `usersPasswordSchema`, a `passwordConfirm` field, a cross-field `.refine` for match, `termsAccepted` (required boolean), `analyticsConsent` (optional boolean), and `imageUploadSchema`. Error messages are thunked to re-resolve on locale change.
- **`submitForm`** – Orchestrates the full flow: `clearSignupError` → `handleSubmit` (validates, then calls `authStore.signup` with `withAntibotToken`) → `uploadPickedAvatar` → `redirectAfterLogin` → success toast. Server errors are mapped to fields via `applyServerErrors`; unmapped ones land on `useBlockingError`.
- **`uploadPickedAvatar`** – Fire-and-forget avatar upload wrapped in `trackUpload` so `FormImageUpload` shows progress. A failure only fires a toast; it never fails the already-created account.
- **`useStructureFormValidation<UserSignupForm>`** – Provides `form`, `formErrors`, `isSubmitting`, `handleSubmit`, `applyServerErrors`. Configured with `revalidateOn: locale` and `invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR`.
- **`usePasswordBreachCheck`** – Advisory k-anonymity breach check; debounced internally. Never gates submission.
- **`useBlockingError`** – Local error state for API failures that name no specific field; rendered next to the submit button instead of a toast.
- **`humanCheck` (template ref to `<HumanCheck>`)** – Antibot widget; its `.token` is attached to the signup request unconditionally via `withAntibotToken`.
- **`continueTo`** – Computed that extracts a same-origin `?continue=` query param, forwarded to the OAuth start URL.
- **OAuth section** – Uses `useOAuthProvidersStore` (fetched once), `oauthStartUrl`, `providerLabel`, and `routerLinkI18n` to render provider buttons.

## Relationships

- **`@/modules/users`** – Imports `usersSchema` and `usersPasswordSchema` as the base rules the signup schema extends.
- **`@/modules/account/stores/auth.ts`** – Calls `signup()` and `setAvatarAfterSignup()` on the auth store.
- **`@/modules/account/stores/oauth.ts`** – Reads available providers, builds the OAuth redirect URL, and labels each button.
- **`@/modules/account/composables/use-password-breach-check.ts`** – Supplies the advisory breach signal.
- **`@/modules/account/composables/use-post-login-redirect.ts`** – Provides `redirectAfterLogin()` and `isSameOriginPath()`.
- **`@/ui/molecules/FormImageUpload.vue`** – Bound to `form.imageUpload`; receives `uploadProgress` and `disabled` from `isSubmitting`.
- **`@/modules/account/components/PasswordStrengthMeter.vue`** – Live strength indicator bound to `form.password`.
- **`@/infrastructure/http/antibot.ts`** – `withAntibotToken` wraps the signup payload with the human-check token.
- **`@/infrastructure/utils/use-blocking-error.ts`** – Local error surfacing for unmapped API failures.

## Notes

- **Signup logs the user in.** `POST /account/signup` sets session cookies; the router guard mints the access token on the next navigation. The account lands in `unverified` state until email confirmation.
- **No username field.** The auth store defaults it to the email address internally.
- **Antibot token is attached unconditionally** (unlike login/payment retries which wait for a first refusal). An eslint-disable comment documents a TypeScript-ESLint limitation with the `HumanCheck` template-ref type.
- **`handleSubmit`'s callback must resolve `void`.** The success `addMessage` call is wrapped in a bare `.then(() => {…})` to satisfy this while discarding the message-id returned by vue-toolkit 5.
- **Avatar upload failure is non-fatal.** The account already exists; the user retries from the profile page.
- **`termsAccepted` is the only required checkbox**; `analyticsConsent` unchecked is a valid state. Server-side `enum: [true]` enforces the former regardless of client validation.
