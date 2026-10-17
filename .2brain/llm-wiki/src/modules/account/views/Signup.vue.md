---
source: src/modules/account/views/Signup.vue
sha256: 5cbf0dcfad8b662ebe3c578cd530e8baf83654f890d17025b425ada2b5c07841
generated_at: 2026-10-17T00:31:08.589028+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/Signup.vue

## Purpose

The signup page view. It collects email, password (+ confirm), a required terms checkbox, an optional analytics-consent checkbox, and an optional profile image, then calls `POST /account/signup` via the auth store. After the account is created (and a session cookie is set), it optionally uploads the chosen avatar with a follow-up `PATCH /account`, then redirects via `usePostLoginRedirect`. It also renders OAuth sign-in buttons and an antibot (`HumanCheck`) widget whose token is attached to every submit.

## Key elements

- **`signupSchema`** — Zod schema built by picking `email` from the shared `usersSchema`, extending with `usersPasswordSchema`, `passwordConfirm`, `termsAccepted` (required via `.refine`), `analyticsConsent` (optional boolean), `imageUpload`, and a top-level `.refine` that enforces password / passwordConfirm equality.
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) — Drives form state, client-side validation, server-error mapping (`applyServerErrors`), focus-on-invalid, and the `handleSubmit` wrapper. Re-validates on locale change.
- **`submitForm`** — Clears any prior blocking error, calls `authStore.signup(...)` with `withAntibotToken(humanCheck.token)`, then chains `uploadPickedAvatar()` → `redirectAfterLogin()` → success toast. On API failure, `applyServerErrors` maps field-level errors; unmapped errors fall through to `useBlockingError`.
- **`uploadPickedAvatar`** — If a file was chosen, calls `setAvatarAfterSignup` wrapped in `trackUpload` (from `useAxiosUploadProgress`) so `FormImageUpload` shows real progress. Catches and toasts failure; never rejects (the account already exists).
- **`usePasswordBreachCheck`** — Watched on every password keystroke (debounced internally). Exposes `passwordBreached` which drives an advisory `<v-alert>`; it never blocks submission.
- **`useBlockingError`** — Local error state rendered next to the submit button when the server response names no specific field.
- **`HumanCheck`** — Antibot widget; its `.token` is attached unconditionally to every `signup` call via `withAntibotToken` (unlike login/payment flows that attach only after a first refusal).
- **`name: 'SignupPage'`** — Declared in a separate `<script>` block because `<script setup>` cannot set a component name; needed for devtools and `<KeepAlive>`.

## Relationships

- **`stores/auth.ts`** — Consumes `signup()` and `setAvatarAfterSignup()` actions; the store performs the HTTP calls.
- **`composables/use-post-login-redirect.ts`** — Called after successful signup to honour `?continue=` and route the fresh session to the correct destination.
- **`composables/use-password-breach-check.ts`** — Provides the debounced HIBP-style check and the `breached` ref shown in the warning alert.
- **`components/PasswordStrengthMeter.vue`** — Rendered below the password field; receives the current password string for zxcvbn-style scoring.
- **`components/OAuthButtons.vue`** — Rendered below the form as an alternative sign-up path.
- **`tests/signup-continue.spec.ts`** — Verifies the `?continue=` redirect behaviour after successful signup.
- **`tests/signup-antibot.spec.ts`** — Verifies that the `HumanCheck` token is attached to the signup request.
- **`tests/password-breach-hint.spec.ts`** — Verifies the advisory breach alert appears/disappears correctly.
- **`tests/oauth-continue.spec.ts`** — Verifies the OAuth button flow and its redirect.

## Notes

- **Avatar upload is best-effort.** A failed `setAvatarAfterSignup` is caught, toasted, and swallowed — the account is already created. The profile page is the retry surface.
- **`termsAccepted` is the only required checkbox.** `analyticsConsent` is a plain optional boolean (unchecked is valid). The server also enforces `termsAccepted === true` (`enum: [true]`), so a client that skipped the refine would still get a 422.
- **Antibot token is attached every time.** Unlike the login and payment flows (which attach only after a first `403`), signup always includes `withAntibotToken(humanCheck.token)` because `POST /account/signup` is guarded by `humanChallengeGate` unconditionally.
- **The ESLint disable on `humanCheck.value?.token`** exists because TypeScript-ESLint cannot fully resolve a template-ref's `InstanceType<typeof HumanCheck>` SFC instance type, even though `token` is explicitly `defineExpose`d in `HumanCheck.vue`.
- **`addMessage` now returns a message id** (vue-toolkit 5). The success-toast call site discards it; the `.then(() => { addMessage(...) })` wrapper ensures the `handleSubmit` callback still resolves `void`.
- **No username field.** The auth store defaults the username to the email address.
- **Signup does log the user in.** `POST /account/signup` sets session cookies; the router's restore guard mints the access token on navigation, same bootstrap the OAuth callback uses. The new account is `unverified` and is blocked at the till.
