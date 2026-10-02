---
source: src/modules/account/components/ProfilePasswordChange.vue
sha256: 915119075563bf288249ed7a693e9f6044e325bd7c311e4d8e8c42dbbfc5867e
generated_at: 2026-10-02T12:11:47.151195+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfilePasswordChange.vue

## Purpose

A collapsible form on the profile page that lets the visitor change their password in a single round-trip (proving the current password rather than an email reset). It is hidden behind a toggle so the profile page does not open with three forms visible at once.

## Key elements

- **`passwordForm` / `passwordErrors` / `handlePasswordSubmit`** — produced by `useStructureFormValidation` with a zod schema (`currentPassword`, `password`, `passwordConfirm`) and a `superRefine` that adds a custom issue on the `passwordConfirm` path when the two new-password fields disagree.
- **`submitPasswordChange`** — wraps `handlePasswordSubmit`; on success toasts, clears all three fields, collapses the form, and fires a best-effort `fetchSessions()` (isolated in its own `.catch` so a refresh failure never surfaces as a form error). On failure calls `applyServerErrors` with an `onUnmapped` fallback that reports into `useBlockingError`.
- **`useBlockingError` → `passwordChangeError` / `reportPasswordChangeError` / `clearPasswordChangeError`** — keeps a rejected submit (e.g. wrong current password) as an inline `InlineErrorAlert` rather than a toast.
- **`usePasswordBreachCheck` → `passwordBreached` / `checkPasswordBreach`** — advisory HIBP check on the new-password field, debounced inside the composable; triggered via a `watch` on `passwordForm.value.password`. Never blocks submission.
- **`showChangePassword` / `passwordFormId`** — toggle state and `useId`-generated id wiring the toggle's `aria-controls` to the form.
- **`PasswordStrengthMeter`** — sibling component rendering a strength bar bound to the new-password field.
- **`usersPasswordSchema`** (from `@/modules/users`) — shared zod schema reused for the `password` field.

## Relationships

- **`useProfileStore` → `changePassword`** — performs the actual API call; this component is the only UI caller for this action.
- **`useAccountSessionsStore` → `fetchSessions`** — refetched after a successful change because the server revokes all other sessions.
- **`@guebbit/vue-toolkit` → `useNotificationsStore`, `useStructureFormValidation`** — toast dispatch and the form-validation lifecycle.
- **`usePasswordBreachCheck`** (sibling composable) — advisory breach signal; no dependency on the submit path.
- **`src/infrastructure/utils/logger.ts`** — listed as a graph neighbor; no direct import or call is visible in this file (likely a transitive dependency through one of the toolkit or store modules).

## Notes

- The confirm-match rule is implemented via `z.superRefine` rather than a separate `.refine`, so it runs at the same parse pass and the `t()` call is already lazy — no thunk needed.
- `revalidateOn: locale` is passed to `useStructureFormValidation`, meaning zod error messages re-resolve when the i18n locale changes at runtime.
- The `fetchSessions()` call is deliberately wrapped in `Promise.resolve().then(...).catch(() => undefined)` so a synchronous throw or rejected refresh cannot be caught by the outer `.catch` and misreported as a password-change failure.
- The breach check is explicitly *not* a submit gate; the four password-set paths (server-side) remain the authority.
- `VUETIFY_INVALID_FIELD_SELECTOR` is used so `useStructureFormValidation` can focus the first invalid Vuetify field on invalid submit.
