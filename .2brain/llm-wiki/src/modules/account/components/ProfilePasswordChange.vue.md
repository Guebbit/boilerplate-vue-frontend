---
source: src/modules/account/components/ProfilePasswordChange.vue
sha256: 35e701e3c294d71784930829d48f923c8c6683c98c89fef8ad0edd0d85d560f0
generated_at: 2026-10-17T00:16:24.395362+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfilePasswordChange.vue

## Purpose

A collapsible form for live password change (current-password-verified, no email round-trip). It sits inside the Profile view and is hidden behind a toggle so the page does not open with all three account forms visible simultaneously.

## Key elements

- **`showChangePassword` (ref)** — controls form visibility; the toggle button flips it.
- **`passwordForm` / `passwordErrors` / `showPasswordErrors` / `isSubmittingPassword` / `handlePasswordSubmit` / `applyServerErrors`** — returned by `useStructureFormValidation`; the zod schema includes a `superRefine` that adds a custom issue on `passwordConfirm` when it does not match `password`.
- **`submitPasswordChange`** — calls `handlePasswordSubmit` (which gates on client-side validation and focuses the first invalid field), then delegates to `changePassword` from the profile store. On success it clears the fields, collapses the form, and fire-and-forgets `fetchSessions()`. On failure it routes through `applyServerErrors` → `reportPasswordChangeError`.
- **`passwordChangeError` / `reportPasswordChangeError` / `clearPasswordChangeError`** — from `useBlockingError`; keeps a rejected submit (e.g. wrong current password) as an inline `InlineErrorAlert` rather than a toast.
- **`passwordBreached` / `checkPasswordBreach`** — from `usePasswordBreachCheck`; debounced inside the composable. A `watch` on `passwordForm.password` triggers the check on every keystroke. Strictly advisory — renders a `v-alert` warning and never blocks submission.
- **`passwordFormId`** — from `useId()`; wires `aria-controls` on the toggle to the `<form>` element.

## Relationships

- **Profile.vue** (parent) — renders this component inside the profile page layout.
- **Profile store** (`stores/profile.ts`) — provides `changePassword(current, new, confirm)` which performs the API call.
- **Sessions store** (`stores/sessions.ts`) — provides `fetchSessions()`, called best-effort after a successful change because the server revokes all other sessions.
- **PasswordStrengthMeter.vue** — rendered below the new-password field; receives the current `password` value for live strength scoring.
- **use-password-breach-check.ts** — composable that debounces and performs the HIBP-style lookup; exposes `breached` boolean and `check()` function.
- **password-breach-hint.spec.ts** — unit test covering the advisory breach-warning behaviour of this component.
- **password-change-sessions-refresh.spec.ts** — unit test verifying that `fetchSessions` is called after a successful submit.

## Notes

- The breach check is **never** a submit gate; the four password-set paths remain the server-side authority. The template comment and `@module` JSDoc both make this explicit.
- `fetchSessions()` after success is wrapped in a detached `Promise.resolve().then().catch(() => undefined)` so a failure (or synchronous throw) in the sessions refresh can never surface as this form's error.
- The component uses a separate `<script>` block solely to declare `name: 'ProfilePasswordChange'` because `<script setup>` cannot set a component name; this is needed for devtools and `<KeepAlive>`.
- The `superRefine` confirm-match check calls `t()` directly (no thunk) because `superRefine` runs at parse time, at which point the locale is already resolved.
- `logger.ts` appears in the dependency graph but is **not** imported by this file; it is likely pulled in transitively by one of the composable/store dependencies.
