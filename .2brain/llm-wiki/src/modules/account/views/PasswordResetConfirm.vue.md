---
source: src/modules/account/views/PasswordResetConfirm.vue
sha256: a6733aceeb5690429ea644c569adfa88ce8baf0ede81e2c521557ce732d80164
generated_at: 2026-10-17T00:30:15.691889+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/PasswordResetConfirm.vue

## Purpose
Public password-reset confirmation page. The visitor arrives with a one-time token (prefilled from the email link), enters a new password and its confirmation, and the page validates locally (zod) then calls the auth store to set the new password. Success redirects to Login.

## Key elements
- **`submitForm`** – Orchestrates the submit: clears any prior blocking error, runs `handleSubmit` (which triggers zod validation + focus/announce of invalid fields), calls `confirmPasswordReset(token, password, confirm)`, toasts success and routes to `Login` on resolve, or maps server errors to fields / a form-level blocking error via `applyServerErrors`.
- **Zod schema** – `token` (min 1), `password` (delegated to shared `usersPasswordSchema`), `passwordConfirm` (min 8), plus a `.refine` that the two password fields match (error assigned to `passwordConfirm` path).
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) – Provides reactive `form`, `formErrors`, `isSubmitting`, `handleSubmit`, `applyServerErrors`, and revalidation on locale change. Focuses the first invalid Vuetify field via `VUETIFY_INVALID_FIELD_SELECTOR`.
- **`usePasswordBreachCheck`** – Advisory k-anonymity breach check; a `watch` on `form.password` feeds it. Exposes `breached` (drives the `v-alert` in the template) and `check` (debounced internally). Never gates submission.
- **`useLinkTokenCleanup`** – Strips the token from the URL (query/hash) after mount so it doesn't linger in history, analytics, or browser sessions.
- **`useBlockingError`** – Local reactive pair (`message`/`type`) for API errors that name no specific field (e.g. spent or unknown token); rendered by `InlineErrorAlert` next to the submit button.
- **Component name block** (`export default { name: 'PasswordResetConfirmPage' }`) – Stable name for `<KeepAlive>` / devtools, required because `<script setup>` cannot declare one.

## Relationships
- **`../stores/auth.ts`** – Calls `confirmPasswordReset(token, password, confirm)`; this is the single mutation this page performs.
- **`../components/PasswordStrengthMeter.vue`** – Rendered below the new-password field; receives `form.password` reactively.
- **`../composables/use-password-breach-check.ts`** – Provides the advisory `breached` flag and `check` function; the page never blocks on its result.
- **`../tests/password-breach-hint.spec.ts`** – Unit/integration spec that exercises the breach-warning behavior rendered by this page.

## Notes
- The breach check is strictly advisory: the four password-set code paths remain the authoritative gate, enforced server-side. The `v-alert` in the template is a warning, not a validation error.
- The token is read from the route via `readLinkToken(route)` at setup time and then cleaned from the URL. It is **not** stored in a separate reactive variable—only in `form.token`.
- `router.push` returns `NavigationFailure | undefined`; the `.then(() => undefined)` after it is intentional to satisfy the `Promise<void>` contract of `handleSubmit` and to leave navigation-error reporting to the router's own `onError`.
- `revalidateOn: locale` in the form-validation config means changing the app language re-runs all zod error messages (important because messages are i18n lookups).
