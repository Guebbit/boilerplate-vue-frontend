---
source: src/modules/account/composables/use-post-login-redirect.ts
sha256: 3c00307028460e85c512bb4198cd06eaa40fed11f56cac8245241d055fee52a7
generated_at: 2026-10-02T12:15:34.809669+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/composables/use-post-login-redirect.ts

## Purpose

Centralizes the post-login navigation so both login steps (plain form and 2FA challenge) share one exit path. Before navigating, it optionally switches to the visitor's saved locale preference. Extracted into its own composable to avoid each login step re-deriving the redirect logic.

## Key elements

- **`isSameOriginPath(value: unknown): value is string`** — Type-guard that returns `true` only for a single string starting with `/` but not `//`. Protects against repeated query params (`?continue=a&continue=b` yielding an array) and protocol-relative phishing URLs (`//evil.example`). Exported for reuse by `stores/oauth.ts`.
- **`usePostLoginRedirect()`** — Composable that captures `useRouter`, `useRoute`, and the active `useI18n` locale, then exposes a single action.
- **`redirectAfterLogin()`** (returned by the composable) — Async action that navigates in priority order: (1) validated `?continue=` path, (2) `Home` in the profile store's saved locale (if it differs from current and is in `supportedLanguages`), (3) plain `Home`. Returns the router promise.

## Relationships

- **`@/modules/account/stores/profile.ts`** — Reads `profile?.locale` to determine the visitor's saved language preference for the fallback target.
- **`@/i18n`** — Imports `supportedLanguages` to validate the saved locale is one this build actually speaks.
- **`@/i18n/router-link.ts`** — Uses `routerLinkI18n` to build locale-parameterised route objects for the `:locale` param.
- **`stores/oauth.ts`** — Imports `isSameOriginPath` from this file to guard the `?continue=` value it forwards as its own query param in `oauthStartUrl`.

## Notes

- **Routing only, not activation.** The composable navigates to a `:locale` route param but does *not* call `localeChoice` / load dictionaries. Dictionary loading is intentionally deferred to the target route (see `AppLanguageSwitcher.vue` docblock). Activating the locale before navigation would be wrong because the route transition is what triggers the correct bundle load.
- **`?continue=` is never trusted blindly.** The `isSameOriginPath` guard is the single source of truth; any new consumer of a `?continue=` value should import it rather than re-implement the check.
- **Locale priority is deliberate:** saved profile preference beats the current tab locale (the record "joins the session" at login), but a `?continue=` deep link keeps whatever locale the named page carries.
