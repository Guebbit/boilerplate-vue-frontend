---
source: src/modules/account/composables/use-post-login-redirect.ts
sha256: be33c5ded3d43fabea79c99a2c772cf1e1e8d13b3a6c7caad21dd8b504c963d3
signature: 1afca7317efafc8cb3d2bd983a995d7fef68d8911e48f5682054b797cd42ddd8
generated_at: 2026-11-10T03:24:38.494229+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/composables/use-post-login-redirect.ts

## Purpose

Centralises the "where does a visitor land once a session exists" decision so that every login step (plain form, 2FA, OAuth callback, account restore, signup) resolves the redirect identically instead of each re-deriving it. Encapsulates the `?continue=` deep-link guard, the saved-locale preference, and the Home fallback into a single `redirectAfterLogin()` call.

## Key elements

- **`isSameOriginPath(value: unknown): value is string`** – Type-guard that accepts only a single string that resolves to the same origin under WHATWG URL rules. Rejects `string[]` (repeated query params) and protocol-relative URLs (`//evil.example`, `/\evil.example`). Exported so `stores/oauth-providers.ts` can reuse the identical guard when forwarding `?continue=` into the OAuth start URL.
- **`usePostLoginRedirect()`** – Composable that returns `{ redirectAfterLogin }`. Reads `route.query.continue`, the profile store's saved locale, and the current i18n locale, then navigates via `router.push` in that priority order.
- **`SAME_ORIGIN_PLACEHOLDER`** – Internal `http://same-origin.invalid` base used with `URL` to test whether a candidate path stays on the same origin. Uses the RFC 2606 `.invalid` TLD.

## Relationships

- **`src/modules/account/views/Login.vue`**, **`src/modules/account/views/TwoFactorChallenge.vue`**, **`src/modules/account/views/OAuthCallback.vue`**, **`src/modules/account/views/AccountRestoreChallenge.vue`**, **`src/modules/account/views/Signup.vue`** – Each calls `redirectAfterLogin()` exactly once after a session is established, replacing per-view navigation logic.
- **`src/modules/account/stores/profile.ts`** – Read for `profile?.locale`; the saved language preference is the second-priority redirect target.
- **`src/modules/account/components/OAuthButtons.vue`** – Indirectly upstream: it initiates the OAuth flow whose callback view (`OAuthCallback.vue`) eventually calls `redirectAfterLogin`. The `isSameOriginPath` export also guards the `?continue=` value that the OAuth start URL carries forward.

## Notes

- **Locale precedence is deliberate:** `?continue=` target > saved profile locale > current-locale Home. A `?continue=` deep link keeps whatever locale the target page specifies; a saved preference overrides the tab's active locale; neither changes anything if the saved locale is unsupported by the current build.
- **Routing only, not activation:** The composable sets the `:locale` route param but does **not** call `localeChoice` / activate the dictionary. Activation is the responsibility of `AppLanguageSwitcher.vue` reacting to the param change — activating here first would race the navigation.
- **Security guard is two-fold:** the function rejects both the `string[]` shape (vue-router parses repeated `?continue=a&continue=b` as an array) and protocol-relative/backslash-slash URLs that browsers treat as cross-origin. A naive `startsWith('/')` check is insufficient; WHATWG `URL` resolution is the authority.
