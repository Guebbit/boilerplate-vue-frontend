---
source: src/modules/account/composables/use-post-login-redirect.ts
sha256: 360baf2d02da8f0f881b04b8b4c3f7d372b15d5722109210db57b52236e2930a
generated_at: 2026-10-17T00:17:59.791699+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/composables/use-post-login-redirect.ts

## Purpose

Centralises the "where do I go once a session exists" logic so that every login step (plain form, 2FA challenge, OAuth callback, signup) ends with the same navigation rather than each re-deriving it. When the visitor's saved record carries a locale preference, it chains that switch onto the `Home` route before navigating.

## Key elements

- **`isSameOriginPath(value: unknown): value is string`** — Type-guard that accepts only a single relative path (`/…`) resolving to the same origin. Rejects repeated-query-param arrays, protocol-relative URLs (`//evil`), and backslash tricks (`/\evil`). Uses WHATWG `URL` parsing against a placeholder origin. Exported for reuse by the OAuth start-redirect logic.
- **`usePostLoginRedirect()`** — Composable returning `{ redirectAfterLogin }`.
- **`redirectAfterLogin()`** — Reads `route.query.continue` (validated by `isSameOriginPath`), the profile store's `locale` preference, and the active `locale` from `useI18n`. Navigates in priority order: valid `?continue=` path → `Home` in the saved locale (if supported and different from current) → `Home` in the current locale. Returns the router promise.

## Relationships

- **`stores/profile.ts`** — Imported; reads `profile?.locale` to decide whether to target a locale-prefixed `Home` route.
- **`Login.vue` / `TwoFactorChallenge.vue` / `OAuthCallback.vue` / `Signup.vue`** — The calling views. The module docblock names the plain form and 2FA challenge as the two primary steps that call `redirectAfterLogin`; OAuth callback and signup follow the same pattern.
- **`OAuthButtons.vue`** — Originates the `?continue=` query param in the OAuth redirect URL. `isSameOriginPath` is exported so the OAuth start flow (`stores/oauth.ts`'s `oauthStartUrl`, per its docblock) validates the same value without duplicating the guard.

## Notes

- **Routing only, not locale activation.** The composable navigates to a route carrying a `:locale` param but deliberately does *not* call `localeChoice` / activate the language itself — that is the job of `AppLanguageSwitcher.vue` reacting to the route param. Activating before navigation would be premature (the target page's own locale context is what loads the correct dictionary).
- **`SAME_ORIGIN_PLACEHOLDER`** is `http://same-origin.invalid` — a non-resolvable TLD chosen purely so `new URL(path, base).origin` is a stable comparison target; it is never used in real navigation.
- **`route.query.continue` can be `string | string[]`** per vue-router's typing; the guard handles this by checking `typeof value === 'string'` first, avoiding an unsafe cast.
- The saved-locale check requires `supportedLanguages.includes(saved)` — a locale the current build does not ship a bundle for is silently ignored rather than producing a broken route.
