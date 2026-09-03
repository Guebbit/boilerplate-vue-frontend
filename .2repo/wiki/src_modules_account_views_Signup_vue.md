# src/modules/account/views/Signup.vue

## Purpose

The user-facing account registration page. It collects email, password (with confirmation), an optional avatar upload, and a terms/conditions acknowledgment, then calls the auth store's `signup` action. On success it redirects to the Login route (the account still requires email confirmation) rather than establishing a session. It also renders conditional OAuth "continue with" buttons when providers are configured.

## Key elements

- **`signupSchema`** — Zod schema built by picking `email` from the shared `usersSchema`, extending with `usersPasswordSchema`, a `passwordConfirm` field, a `conditions` boolean, and an `imageUpload` file field; a top-level `.refine` enforces password === passwordConfirm with the error attached to the `passwordConfirm` path. All error messages are thunks (`() => t(…)`), so i18n is resolved at parse time.
- **`trackUpload`** — Thin wrapper that calls `useToolkitUploadProgress`'s `track`, enabling progress reporting only when a `File` is actually attached. Returns the store promise so the caller can chain `.then`/`.catch`.
- **`submitForm`** — Validates via `useStructureFormValidation`, then calls `useAuthStore().signup` with the form payload and optional `AxiosRequestConfig` (carrying `onUploadProgress`). On success pushes to the `Login` route preserving the current query string and fires a "check your email" notification. On failure, first attempts `applyServerErrors` to map field-level server errors; falls back to `notifyErrorMessages` toast.
- **OAuth section (template)** — Renders a `v-btn` per provider using a real `href` (from `oauthStartUrl`) instead of a router link or click handler, because the OAuth redirect flow requires genuine top-level navigation.
- **Conditions checkbox** — Uses `i18n-t` with two slot links (`#terms`, `#privacy`); `@click.stop` on each `RouterLink` prevents Vuetify's clickable-label from also toggling the checkbox.
- **`useStructureFormValidation`** call — Configured with `revalidateOn: locale` so already-rendered error strings re-translate on locale switch, and `invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR` for automatic scroll-to-first-error.

## Relationships

The listed graph neighbor `src/infrastructure/utils/logger.ts` is **not** imported or referenced anywhere in this file. The file's actual infrastructure imports are `@/infrastructure/utils/errors.ts` (server-error mapping + invalid-field selector) and `@/infrastructure/utils/uploads.ts` (`imageUploadSchema`). It also depends on the shared `@/modules/users` schema exports and `@/modules/account/stores/auth.ts` / `oauth.ts` stores.

## Notes

- **No session is created on signup.** The success path navigates to `Login`; the user must confirm their email before they can sign in. This is intentional and differs from the Login flow.
- **No username field.** The auth store internally defaults the username to the email address; the form never asks for one.
- **OAuth buttons are real `<a>` elements.** Using `v-btn`'s `href` prop (not `to` or `@click`) is a hard requirement of the OAuth redirect dance; swapping to a `RouterLink` or programmatic `window.location` will break the flow.
- **Upload progress fallback.** `event.progress ?? 0` guards against Axios omitting `progress` on chunked/compressed responses, keeping the progress bar stationary rather than animating to garbage values.
- **`trackUpload` is a no-op enabler when no file is present.** It passes `{ enabled: false }` to `track`, so the progress UI stays idle for text-only signups.
- **`formElement` ref + `novalidate`.** The native form is marked `novalidate` so the browser does not intercept submission; the toolkit handles focus/scroll on invalid fields using the Vuetify selector.
