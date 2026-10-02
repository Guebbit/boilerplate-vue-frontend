---
source: src/modules/account/views/PasswordResetConfirm.vue
sha256: d25c905651ce3f6d248c495dd6791268b90cf6595880aad566d40f1db2942b48
generated_at: 2026-10-02T12:37:15.090575+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/PasswordResetConfirm.vue

## Purpose

Public, unauthenticated page where a user who clicked the emailed reset link enters a new password. The one-time token (carried as a URL query param) is the sole credential; the page validates the form with Zod, calls the auth store to set the new password, and redirects to `Login` on success.

## Key elements

- **`PasswordResetConfirmForm`** (interface) — shape of the form state: `token`, `password`, `passwordConfirm`.
- **Zod schema with `.refine`** — enforces `token` non-empty, `password` via `usersPasswordSchema`, `passwordConfirm` min 8 chars, and a cross-field check that the two password fields match.
- **`useStructureFormValidation`** (`@guebbit/vue-toolkit`) — owns form state, server-error mapping, submit lifecycle, and focus-to-first-invalid-field.
- **`useClearQueryOnMount`** — strips the `token` query param from the URL after mount so it does not persist in browser history or analytics.
- **`usePasswordBreachCheck`** — advisory k-anonymity breach check; debounced internally, triggered on every keystroke via a `watch`; **never blocks submission**.
- **`useBlockingError`** — local error surface for token-level rejections (spent/unknown token) that don't map to a specific field; rendered as `InlineErrorAlert` next to the submit button.
- **`submitForm`** — clears any prior blocking error, runs `confirmPasswordReset(token, password, passwordConfirm)` from `useAuthStore`, toasts success, navigates to `Login`; on failure delegates to `applyServerErrors` with an `onUnmapped` fallback into `useBlockingError`.
- **`PasswordStrengthMeter`** — visual strength indicator bound to the password field.
- **`routerLinkI18n`** — wraps `router.push` / `<v-btn :to>` targets with the active locale so i18n routes resolve correctly.

## Relationships

The dependency graph lists `src/infrastructure/utils/logger.ts` and `src/modules/account/views/TwoFactorChallenge.vue` as neighbors, but no direct import or reference to either file is present in this component. Interaction with both (if any) is indirect through shared store or route-level wiring, not visible in this file's source.

## Notes

- The breach check is explicitly **advisory** — it renders a warning `v-alert` but has no effect on whether `handleSubmit` proceeds. The four server-side password-SET endpoints remain the authority.
- The `.then(() => undefined)` after `router.push` is deliberate: `router.push` resolves to `NavigationFailure | undefined`, which is incompatible with the `Promise<void>` contract of the submit handler. Navigation failures are the router's `onError` concern, not this form's.
- `useClearQueryOnMount` exists because the token must not leak into analytics (Umami, Faro) or the back/forward stack after the page has loaded.
- The `refine` error is attached to `path: ['passwordConfirm']` so the confirm field is the one highlighted, matching the i18n string "passwords don't match."
- `revalidateOn: locale` in the form-validation options means changing language re-runs the Zod schema so translated error messages appear without a manual re-render.
