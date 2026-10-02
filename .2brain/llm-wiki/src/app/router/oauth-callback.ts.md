---
source: src/app/router/oauth-callback.ts
sha256: b554fc4ee88632c167535be7b7703aeb9c2f3e0cf9e7fb1d20ae4cc6b99e864f
generated_at: 2026-10-02T11:49:00.754769+00:00
model: ollama:qwen3.8:27b
---

# src/app/router/oauth-callback.ts

## Purpose

Converts the raw query string from a backend OAuth redirect (`/oauth/callback?locale=…&…`) into a localized Vue Router location for the `OAuthCallback` route. It exists because the redirect lands on a locale-less backend URL, so the visitor's language must be re-applied client-side before the callback view renders.

## Key elements

- **`oauthCallbackLocation(query: LocationQuery): RouteLocationRaw`** (default/named export)
  - Destructures `locale` out of the incoming query; all other keys (`error`, `mfaRequired`, `continue`, etc.) are forwarded unchanged in `query`.
  - Validates `locale` against `supportedLanguages`; if it is a string in that list it is used, otherwise `getDefaultLocale()` is used.
  - Returns a named-route object `{ name: 'OAuthCallback', params: { locale }, query: rest }`.

- **`@/i18n` imports** — `getDefaultLocale` and `supportedLanguages` supply the locale fallback and the allow-list.
- **`vue-router` type imports** — `LocationQuery` and `RouteLocationRaw` type the I/O; no runtime router dependency in this file.

## Relationships

No graph neighbors are recorded. The file is a leaf: it is consumed by whatever route handler or component triggers the OAuth callback navigation, and it depends only on `@/i18n` for locale metadata.

## Notes

- `locale` is **removed** from the outgoing query object (via destructuring with rest spread), so the callback view never sees it as a query parameter — it lives exclusively in `params`.
- The validation is intentionally narrow: only `typeof locale === 'string'` entries that appear in `supportedLanguages` are honoured. A missing, non-string, or unsupported value silently falls back to the default locale.
- The file is type-only relative to `vue-router` (no `createRouter`, no navigation calls); it is a pure mapping helper, safe to unit-test in isolation.
