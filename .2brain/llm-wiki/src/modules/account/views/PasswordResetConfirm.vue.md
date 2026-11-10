---
source: src/modules/account/views/PasswordResetConfirm.vue
sha256: 849f96287b0e9183afdee34d72e451640312860edb2aab3095a41ec5fceb9496
signature: 849f96287b0e9183afdee34d72e451640312860edb2aab3095a41ec5fceb9496
generated_at: 2026-11-10T03:47:09.167578+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/PasswordResetConfirm.vue

## Purpose

The public-facing confirmation page for a password reset. The one-time token delivered by email is the sole credential; the user supplies a new password (plus a confirmation field) and, in some cases, accepts Terms. Supports two modes — `reset` (default) and `setup` (staff-created accounts) — that share the same token, endpoint, and form, differing only in whether the Terms checkbox is always visible or appears reactively after a 422.

## Key elements

- **`mode` prop** (`'reset' | 'setup'`, default `'reset'`) — determines whether the Terms checkbox is always rendered (`setup`) or only after the API names `termsAccepted` in a 422 response.
- **Zod schema** (inline) — validates `token`, `password` (via `usersPasswordSchema`), `passwordConfirm` (via `resetPasswordConfirmSchema`), and `termsAccepted`; adds a `.refine` for cross-field password match and a conditional `.refine` for Terms when `showTerms` is true.
- **`useStructureFormValidation`** — provides `form`, `formErrors`, `handleSubmit`, `applyServerErrors`, and `isSubmitting`; wired to the `FormCard`'s form element.
- **`submitForm`** — clears any prior blocking error, calls `confirmPasswordReset` from the auth store, toasts on success and navigates to `Login`; on failure, sets `termsRequired` if the 422 names `termsAccepted`, otherwise maps server errors to fields or reports a blocking error.
- **`namesTerms`** — narrows an unknown rejection to the 422 body shape and checks whether `termsAccepted` is in the error list.
- **`usePasswordBreachCheck`** — advisory HIBP-style check; watches `form.password` on every keystroke (debounced inside the composable) and renders a `<v-alert>` warning. Never blocks submission.
- **`useLinkTokenCleanup`** — strips the token from the URL after mount so it does not persist in history, analytics (Umami, Faro), or pageview data.
- **`useBlockingError`** — holds a form-level error (e.g. spent/unknown token) that has no mappable field; rendered via `<InlineErrorAlert>` below the submit button.
- **`showTerms`** (computed) — `mode === 'setup' || termsRequired`. Gates both the visible checkbox and the Terms zod `.refine`.
- **`PasswordResetConfirmForm`** interface — the typed shape passed to the toolkit validator.

## Relationships

- **`src/modules/account/stores/auth.ts`** — imports `useAccountAuthStore` and calls `confirmPasswordReset(token, password, passwordConfirm, termsAccepted?)`.
- **`src/modules/account/schemas.ts`** — imports `resetPasswordConfirmSchema` for the confirm-password field.
- **`src/modules/account/composables/use-password-breach-check.ts`** — imports `usePasswordBreachCheck`; watches the password field and exposes `breached` / `check` for the advisory warning.
- **`src/modules/account/components/PasswordStrengthMeter.vue`** — rendered below the new-password field as a visual strength indicator.
- **`src/modules/account/components/TermsAcceptanceCheckbox.vue`** — rendered conditionally (`v-if="showTerms"`); two-way-bound to the form's `termsAccepted` field.
- **`src/modules/account/tests/password-reset-confirm-view.spec.ts`** — unit/integration tests for this view's behavior (modes, validation, submit flow).
- **`src/modules/account/tests/password-breach-hint.spec.ts`** — tests for the breach-warning hint logic exercised by this page.

## Notes

- The file deliberately does **not** use `LinkTokenConfirmCard`; the module doc explains this is because the form has a cross-field rule and server field errors that card doesn't support.
- `termsAccepted` is sent as `true` only when the checkbox is visible (`showTerms`), otherwise as `undefined` — the store must tolerate the optional.
- The `confirmPasswordReset` call uses non-null assertions (`form.value.token!`, etc.) because the zod schema guarantees presence after `handleSubmit` validates.
- The `router.push` result is swallowed with `.then(() => undefined)` to satisfy the `Promise<void>` contract of the submit handler; navigation failures are the router's responsibility, not the form's.
- The named `<script>` block exists solely to give the SFC a `name` for devtools / `<KeepAlive>`; `<script setup>` cannot declare one.
