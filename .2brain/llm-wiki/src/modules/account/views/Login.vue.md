---
source: src/modules/account/views/Login.vue
sha256: 1978689cbf649f4ac733bdae575dbefa7d274c7a17f468c9b4b0cc56230aef44
generated_at: 2026-10-17T00:29:51.142310+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/Login.vue

## Purpose

The login page view. It presents an email/password form (plus an optional anti-bot challenge), authenticates via the auth store, and routes the visitor either to their post-login destination or to `TwoFactorChallenge` depending on whether the account has MFA armed.

## Key elements

- **Component name block (`<script>` / `<script setup>` split)** — Declares `name: 'LoginPage'` in a plain `<script>` so devtools and `<KeepAlive>` can identify the SFC; `<script setup>` cannot set `name` itself.
- **`loginSchema`** — Zod schema: `usersSchema.pick({ email })` extended with a password min-length rule. Error messages are thunks that resolve via `t()` at parse time.
- **`useStructureFormValidation`** — Manages form state, per-field errors, submit lifecycle, and focus-on-first-invalid-field via `formElement`. Configured with `revalidateOn: locale` to re-translate in-flight error strings on locale switch.
- **`useBlockingError`** — Inline, field-less error surface (e.g. a 401 that names no field) rendered as `InlineErrorAlert` below the submit button, distinct from per-field errors.
- **`humanCheck` / `requiresHumanCheck`** — Conditional `HumanCheck` widget. Shown only when the server returns `ANTIBOT_VERIFICATION_FAILED`; its `.token` is passed to `withAntibotToken` on the next submit.
- **`submitForm`** — Validates → calls `useAuthStore().login(email, password, remember, antibotToken)` → branches on `outcome.kind`:
  - `'mfa'` → `useTwoFactorStore().beginLoginChallenge(...)` then `router.push(TwoFactorChallenge)`.
  - default → `redirectAfterLogin()`.
  - Catches: `ANTIBOT_VERIFICATION_FAILED` → reveals `HumanCheck`; other 4xx → `applyServerErrors` (field-mapped) or `reportLoginError` (unmapped).
- **`showPassword`** — Toggles the password field between `text`/`password`; Eye/EyeOff icons swap accordingly.
- **`OAuthButtons`** — Rendered below the form for social sign-in.

## Relationships

- **`src/modules/account/stores/auth.ts`** — `useAuthStore().login(...)` performs the actual credential check and returns a `LoginOutcome` that drives the branch logic.
- **`src/modules/account/stores/two-factor.ts`** — `useTwoFactorStore().beginLoginChallenge(outcome, remember)` stashes the MFA challenge state before the route change.
- **`src/modules/account/views/TwoFactorChallenge.vue`** — Navigated to via `router.push` when `outcome.kind === 'mfa'`; consumes the state set by the two-factor store.
- **`src/modules/account/composables/use-post-login-redirect.ts`** — `redirectAfterLogin()` sends the visitor to their pre-auth destination on a plain (non-MFA) login.
- **`src/modules/account/components/OAuthButtons.vue`** — Rendered in the template for alternative sign-in; no runtime data flows between this view and it beyond presence.
- **`src/modules/account/tests/login-view-i18n.spec.ts`** — Tests i18n key usage in this view.
- **`src/modules/account/tests/oauth-continue.spec.ts`** — Exercises the OAuth-continue path that this view's `OAuthButtons` trigger.

## Notes

- **`remember` type mismatch (intentional):** The form binds a plain boolean checkbox, but the API's `LoginRequest.remember` is a tier string. The auth store performs the mapping; the view's generic type `Omit<LoginRequest, 'remember'> & { remember?: boolean }` keeps both sides honest.
- **`.then(() => undefined)` after the outcome branch:** `handleSubmit`'s contract resolves the handler's return value; discarding the `NavigationFailure` from `router.push` prevents an unhandled-rejection path.
- **`revalidateOn: locale`:** Re-runs schema validation (and thus re-translates error messages) whenever the active locale changes — something the Zod schema shape alone cannot do since `formErrors` already holds resolved strings.
- **ESLint disable on `withAntibotToken(humanCheck.value?.token)`:** TypeScript-ESLint cannot resolve the Vue SFC instance type from a template ref even though `HumanCheck.vue` exposes `token` via `defineExpose`; the disable is scoped to that single line.
- **`novalidate` on `<form>`:** Disables browser-native validation so the toolkit's focus/error pipeline has sole control over invalid-field UX.
