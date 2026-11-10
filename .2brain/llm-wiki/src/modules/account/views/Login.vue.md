---
source: src/modules/account/views/Login.vue
sha256: 985e8296513abfa4299fb8d9c828edeb53e228b3abcb47018ce22f06e6f164ba
signature: 985e8296513abfa4299fb8d9c828edeb53e228b3abcb47018ce22f06e6f164ba
generated_at: 2026-11-10T03:46:20.867463+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/Login.vue

## Purpose

The login form page. Collects email and password, validates them client-side, and submits to the auth store. Depending on the server's `LoginOutcome` it either redirects the user onward (plain login), pushes `TwoFactorChallenge` (MFA armed), or pushes `AccountRestoreChallenge` (deletion-pending grace period). Also surfaces an inline antibot human-check widget when the per-identity failure budget is nearly exhausted.

## Key elements

- **`submitForm`** — Validates the form via `useStructureFormValidation`, then calls `useAccountAuthStore().login(email, password, remember, antibotToken)`. Branches on `outcome.kind` (`'deletion-pending'`, `'mfa'`, or default) to set the relevant store and `router.push`. Catches `ANTIBOT_VERIFICATION_FAILED` to reveal the inline `HumanCheck`; other errors are mapped to fields via `applyServerErrors` or blocked in place via `useBlockingError`.
- **`loginSchema`** — Built once from `usersSchema.pick({ email: true }).extend({ password: loginPasswordSchema })`. Messages are thunks so they resolve in the active locale; `revalidateOn: locale` re-translates errors already rendered.
- **`requiresHumanCheck` / `humanCheck`** — Reactive flag + template ref to the `HumanCheck` organism. Rendered only after an antibot rejection; its solved token is read on the next submit via `withAntibotToken(humanCheck.value?.token)`.
- **`loginError` / `reportLoginError`** — `useBlockingError` state for un-mapped 401s; rendered as an `InlineErrorAlert` beneath the submit button rather than a toast.
- **`showPassword`** — Toggles the password field between `password` and `text`; toggle button size adapts via `useTouchFriendlySize` (44 px on touch, compact on `sm`+).
- **`OAuthButtons`** (slot `#footer`) — Renders third-party sign-in buttons below the form.
- **Component name `'LoginPage'`** — Declared in a separate `<script>` block so devtools and `<KeepAlive>` can key it (not possible from `<script setup>` alone).

## Relationships

- **`src/modules/account/stores/auth.ts`** — `useAccountAuthStore().login()` is the sole authentication call; the returned `LoginOutcome` drives all post-submit routing.
- **`src/modules/account/stores/two-factor.ts`** — On an MFA-armed outcome, `beginLoginChallenge(outcome, remember)` is called before navigating to the two-factor challenge route.
- **`src/modules/account/stores/deletion-restore.ts`** — On a deletion-pending outcome, `begin(outcome, remember)` is called before navigating to the account-restore route.
- **`src/modules/account/composables/use-post-login-redirect.ts`** — `redirectAfterLogin()` handles the plain-session path (sends the user to wherever they were headed before the login wall).
- **`src/modules/account/schemas.ts`** — Supplies `loginPasswordSchema` (password length/complexity bounds for the login operation specifically).
- **`src/modules/account/components/OAuthButtons.vue`** — Rendered in the `FormCard` footer slot for third-party sign-in.
- **`src/modules/account/views/TwoFactorChallenge.vue`** — Destination route after an MFA-armed login; this page passes state via the two-factor store and preserves the current route's query.
- **`src/modules/account/tests/login-view-i18n.spec.ts`** — Asserts i18n key coverage on this view.
- **`src/modules/account/tests/oauth-continue.spec.ts`** — Exercises the OAuth-continue flow in the context of this page's layout.

## Notes

- **`remember` type mismatch** — The form holds a plain `boolean` checkbox; the API contract expects a tier. The auth store performs the mapping. The type is declared as `Omit<LoginRequest, 'remember'> & { remember?: boolean }`.
- **Antibot is opt-in by failure count** — `HumanCheck` is *never* shown on a first attempt; the backend only mounts it once the per-identity budget is nearly spent. The widget reads its solved token via a template ref (`humanCheck.value?.token`).
- **ESLint suppressions** on `card.value?.formElement` and `humanCheck.value?.token` are present because TypeScript-ESLint cannot fully resolve `InstanceType<typeof SFC>` from a template ref, even when the SFC explicitly `defineExpose`s the property.
- **`router.push` return is discarded** — The trailing `.then(() => undefined)` swallows `NavigationFailure` so it doesn't reject the submit promise; `handleSubmit` expects a void-resolving handler.
