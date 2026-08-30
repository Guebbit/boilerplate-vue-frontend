# src/modules/account/views/Login.vue

## Purpose

Renders the login form (email + password + remember-me), validates input against a zod schema, calls the auth store to authenticate, then redirects to a `?continue=` deep-link or the Home route — applying the user's saved language preference before landing.

## Key elements

- **`loginSchema`** – Zod schema: picks `email` from the shared `usersSchema`, extends with a `password` min-8 rule. Error messages are thunks (`() => t(...)`) so they resolve to the active locale at parse time.
- **`useAppForm` binding** (`form`, `formErrors`, `handleSubmit`, `applyServerErrors`) – Form state, validation orchestration, and server-error attachment.
- **`submitForm`** – Entry point on `<form @submit>`. Calls `authStore.login(...)`, then:
  - Reads `profileStore.profile?.locale`; if valid and different, calls `changeLanguage(saved)`.
  - Navigates to `?continue=` target or `routerLinkI18n({ name: 'Home' })`.
  - On failure, routes a 422 to the named field via `applyServerErrors`; anything else (e.g. 401) becomes a toast via `notifyErrorMessages`.
- **`showPassword`** – Ref toggling the password field between `text` and `password` input types (Eye / EyeOff icons).
- **Template** – Vuetify card inside `LayoutDefault`; includes a "Remember me" checkbox and a `RouterLink` to the Password Reset page.

## Relationships

| Neighbor | Interaction |
|---|---|
| `useAuthStore` (`stores/auth.ts`) | `submitForm` calls `.login(email, password, remember)`. |
| `useProfileStore` (`stores/profile.ts`) | Reads `.profile?.locale` after successful login to decide whether to switch language. |
| `usersSchema` (`@/modules/users`) | Source of the `email` validation rule (picked, not redefined). |
| `useAppForm` (`infrastructure/composables`) | Provides form state, validation flow, and `applyServerErrors`. |
| `notifyErrorMessages` (`infrastructure/utils/errors.ts`) | Toast fallback when a server error names no form field. |
| `changeLanguage` / `supportedLanguages` (`infrastructure/i18n`) | Applies the saved locale guard-checked before redirect. |
| `routerLinkI18n` (`infrastructure/i18n/router-link.ts`) | Builds i18n-aware `to` targets for Home and PasswordResetRequest. |
| `LayoutDefault` (`app/layouts`) | Page shell wrapping the login card. |

## Notes

- **`remember` mismatch:** The form field is a plain `boolean` checkbox; the API contract (`LoginRequest`) expects a "tier." The auth store performs the mapping — the form never sees the tier type.
- **`?continue=` vs. saved locale:** When `?continue=` is present the saved-language switch is *skipped* (the deep-linked page owns its locale). The redirect still goes to the `continue` path regardless.
- **Re-translation:** Because zod resolves error messages to strings once, a language change *after* an error is shown won't update existing messages. `useAppForm`'s `revalidateOn` option handles re-translating already-displayed errors; the schema shape alone cannot.
- **NavigationFailure discarded:** The trailing `.then(() => undefined)` swallows a Vue Router `NavigationFailure` (e.g. already on the target) so it doesn't reject the promise chain.
