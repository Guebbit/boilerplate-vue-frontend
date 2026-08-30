# src/modules/account/views/Signup.vue

## Purpose

Registration page that collects email, password (with confirmation), a terms checkbox, and an optional avatar upload. Validates the input with a Zod schema built on top of the shared `usersSchema`, calls the auth store's `signup` action, and then redirects the user to the **Login** page (the new account still needs email confirmation before a session can start).

## Key elements

- **`signupSchema`** – Zod schema composed from `usersSchema.pick({ email })` + `usersPasswordSchema` + a `passwordConfirm` field + `conditions` boolean + `imageUpload`. A top-level `.refine` enforces password === passwordConfirm. All error messages are thunked (`() => t(...)`) so i18n strings resolve at parse time.
- **`submitForm`** – Validates via `handleSubmit`, then wraps the `signup` store call in `trackUpload` (from `useUploadProgress`) so `FormImageUpload` can display real multipart progress. On success: `router.push({ name: 'Login', query: route.query })` + a "check your email" toast. On failure: tries `applyServerErrors(error)` first; if that returns `false`, falls back to `notifyErrorMessages`.
- **`UserSignupForm`** – Local interface describing the form's reactive shape (email, password, passwordConfirm, conditions, imageUpload).
- **`formElement`** – `ref<HTMLFormElement>` passed to `useAppForm` so the toolkit can scroll/focus the first invalid field.

## Relationships

- **`src/infrastructure/utils/logger.ts`** – Listed as a graph neighbor but no direct import or call to a logger is visible in this file's source. Any logging likely occurs transitively inside `useAuthStore.signup` or `useAppForm`.

## Notes

- **No login on success.** After a successful signup the user is sent to Login, not logged in. The account is in a "pending email confirmation" state until the user verifies.
- **No username field.** The auth store internally defaults the username to the email address; this form intentionally omits a username input.
- **`trackUpload` is a thin wrapper** around the store call; it exists solely to feed `uploadProgress` into `FormImageUpload`. Remove it and avatar upload still works, just without a progress bar.
- **Error-handling order matters:** `applyServerErrors` maps server-returned field errors back onto the form (e.g. "email already taken"). Only if it returns `false` (no mappable field) does the code emit a generic toast via `notifyErrorMessages`.
- **Two `<script>` blocks:** the first (non-`setup`) only sets the component `name`; all logic lives in the `lang="ts"` `<script setup>` block.
