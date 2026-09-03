# src/modules/account/views/Login.vue

## Purpose

Vue login page component. Accepts email/password (validated via a Zod schema derived from the shared `usersSchema`), authenticates through `useAuthStore`, and redirects to a `?continue=` target or `Home` while re-applying the user's saved language preference. Also renders OAuth provider buttons when any are configured.

## Key elements

- **`submitForm`** — Orchestrates the full login flow: form validation → `authStore.login()` → language preference application → router navigation. Catches errors and either attaches them to the named field (`applyServerErrors`) or toasts them (`notifyErrorMessages`).
- **`loginSchema`** — `usersSchema.pick({ email: true }).extend({ password: z.string().min(8) })`. Error messages are thunks (`() => t(...)`) so they resolve in the active locale at parse time.
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) — Manages form state, exposes `form`, `formErrors`, `showFormErrors`, `handleSubmit`, `applyServerErrors`. Configured with `revalidateOn: locale` to re-translate already-displayed errors on locale switch, and `invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR` for auto-focus.
- **`showPassword`** (`ref<boolean>`) — Toggles the password field between `text` and `password` types; toggled by an `Eye`/`EyeOff` icon button.
- **OAuth section** — Conditionally rendered when `oauthProviders.length > 0`. Buttons use `v-btn`'s `:href` prop (a real `<a>` tag) rather than `RouterLink`, because the OAuth redirect requires a genuine top-level navigation.
- **`revalidateOn: locale`** — The only mechanism that re-translates an error string already on screen; the schema itself cannot do this because `formErrors` holds resolved strings after validation.

## Relationships

- **`@/modules/account/stores/auth.ts`** (`useAuthStore`) — `login(email, password, remember)` is the sole authentication call; its promise gates the redirect.
- **`@/modules/account/stores/profile.ts`** (`useProfileStore`) — Reads `profile.locale` post-login to decide whether to switch the active language before navigating.
- **`@/modules/account/stores/oauth.ts`** (`useOAuthProvidersStore`, `oauthStartUrl`, `providerLabel`) — Fetches provider list once (subsequent mounts are no-ops) and builds the redirect URL per provider.
- **`@/modules/users`** (`usersSchema`) — Source of the shared email validation rule.
- **`@/infrastructure/i18n`** (`changeLanguage`, `supportedLanguages`) — Applies the saved language preference post-login.
- **`@/infrastructure/i18n/router-link`** (`routerLinkI18n`) — Builds locale-aware route objects for the `Home` and `PasswordResetRequest` links.
- **`@/infrastructure/utils/errors.ts`** (`notifyErrorMessages`, `VUETIFY_INVALID_FIELD_SELECTOR`) — Error-to-field mapping and toast fallback.
- **`src/infrastructure/utils/logger.ts`** — Listed as a graph neighbor but no direct import or call is visible in this file; any interaction is indirect (e.g., through a store or utility that logs internally).

## Notes

- The `remember` field on the form is a simple boolean checkbox, whereas `LoginRequest['remember']` is a tier enum. The auth store performs the mapping; the form type is `Omit<LoginRequest, 'remember'> & { remember?: boolean }`.
- The OAuth buttons intentionally use `<a href>` (via `v-btn :href`) instead of `RouterLink` or a click handler — the OAuth redirect requires a full top-level navigation that SPA routing cannot produce.
- `?continue=` wins over the saved language preference: if a `continue` target is present, the locale is left untouched (the target page's locale applies).
- The trailing `.then(() => undefined)` on the login chain discards any `NavigationFailure` so `handleSubmit`'s promise resolves cleanly.
