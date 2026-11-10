---
source: src/modules/account/views/Signup.vue
sha256: a5b7d9653cff1eaeb6e616b8530f54f2a0d6166800e697cc2443620c69842037
signature: a5b7d9653cff1eaeb6e616b8530f54f2a0d6166800e697cc2443620c69842037
generated_at: 2026-11-10T03:48:44.803459+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/Signup.vue

## Purpose
The account-creation page. Collects email, password (+ confirm), terms acceptance, optional analytics consent, and an optional avatar; validates via a Zod schema; registers the account through the auth store (which also sets the session); uploads the avatar as a best-effort follow-up; then redirects the visitor.

## Key elements

- **`signupSchema`** – Built from `usersSchema.pick({ email })` extended with `usersPasswordSchema`, `signupPasswordConfirmSchema`, a required `termsAccepted` refine, an optional `analyticsConsent`, `imageUploadSchema`, and a cross-field `.refine` ensuring `password === passwordConfirm`. Messages are thunked for i18n; `revalidateOn: locale` re-translates on-screen errors when the locale changes.
- **`submitForm`** – Calls `handleSubmit` (vue-toolkit) which validates, then: `signup(…, withAntibotToken(…))` → `uploadPickedAvatar()` → `redirectAfterLogin()` → success toast. Server errors are mapped to fields via `applyServerErrors`; unmapped errors land in the inline `signupError` alert.
- **`uploadPickedAvatar`** – If a file is selected, wraps `setAvatarAfterSignup` in `trackUpload` for progress. Catches and toasts failure without aborting the signup flow.
- **`usePasswordBreachCheck`** – Advisory-only breach lookup; a `watch` on the password field triggers the (debounced) check. Renders a warning `v-alert` but never blocks submission.
- **`useBlockingError`** – Local state for API failures that name no specific field; rendered as an `InlineErrorAlert` below the submit button.
- **`HumanCheck`** (ref) – Antibot widget; its `token` is attached to every `signup` call unconditionally (unlike login/payment retry flows).
- **`usePostLoginRedirect`** – `redirectAfterLogin()` honours the `?continue=` query parameter, shared with the login and OAuth-callback paths.

## Relationships

- **`schemas.ts`** – Supplies `signupPasswordConfirmSchema`, composed into `signupSchema`.
- **`use-post-login-redirect.ts`** – Provides `redirectAfterLogin` for post-signup navigation.
- **`use-password-breach-check.ts`** – Debounced breach query driven by a `watch` on the password field.
- **`PasswordStrengthMeter.vue`** – Rendered in the template beneath the password input.
- **`TermsAcceptanceCheckbox.vue`** – Rendered in the template as the required terms checkbox.
- **`OAuthButtons.vue`** – Rendered in the template (imported at top of `<script setup>`).
- **Tests** – `signup-continue.spec.ts`, `signup-antibot.spec.ts`, `password-breach-hint.spec.ts`, `oauth-continue.spec.ts` exercise the redirect, antibot-token attachment, breach-warning display, and OAuth-continue behaviour of this page.

## Notes

- Signup **does** log the user in: `POST /account/signup` sets session cookies; the router's restore guard mints the access token on the way to `Home`. The new account is `unverified`.
- The avatar upload is a **non-blocking** follow-up (`PATCH /account`). Its failure shows a toast but does not roll back or fail the signup.
- `analyticsConsent` is deliberately **optional** (no `.refine`); `termsAccepted` is **required** both client-side and via the server's `enum: [true]` constraint.
- The antibot token is attached **unconditionally** on every submit (not only after a first refusal), because `POST /account/signup` is always guarded by `humanChallengeGate`.
- `handleSubmit`'s callback must resolve `void` (vue-toolkit constraint); the `.then(() => { addMessage(…) })` pattern avoids leaking the message id.
- The named-component block (`name: 'SignupPage'`) exists because `<script setup>` cannot declare a component name; it is required for devtools and `<KeepAlive>`.
