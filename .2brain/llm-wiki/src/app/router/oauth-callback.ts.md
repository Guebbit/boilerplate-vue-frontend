---
source: src/app/router/oauth-callback.ts
sha256: b554fc4ee88632c167535be7b7703aeb9c2f3e0cf9e7fb1d20ae4cc6b99e864f
signature: 4bc82b323946241f8ebe8169b470ffe465499579fcf10a2b8e4af118a0286db7
generated_at: 2026-11-10T02:56:17.758812+00:00
model: ollama:qwen3.8:27b
---

# src/app/router/oauth-callback.ts

## Purpose

Resolves the unlocalized `/oauth/callback` redirect (sent by the backend) into a localized Vue route location. Because `NODE_FRONTEND_URL` carries only an origin, the visitor's language is round-tripped via a `?locale=` query param; this file validates that param and maps it onto the `OAuthCallback` route.

## Key elements

- **`oauthCallbackLocation(query: LocationQuery): RouteLocationRaw`** — The sole export. Accepts the raw query object from the OAuth redirect, extracts `locale`, validates it against `supportedLanguages`, and returns a named-route location (`OAuthCallback`) with the resolved locale as a route **param**. All remaining query keys (`error`, `mfaRequired`, `continue`, etc.) are forwarded untouched via the `query` field.

## Relationships

- **`@/i18n`** — Imports `getDefaultLocale` (fallback when the carried locale is absent or unsupported) and `supportedLanguages` (the allow-list used for validation).
- **`vue-router`** — Imports the `LocationQuery` and `RouteLocationRaw` types to shape the function's signature and return value.

No other graph neighbors are recorded for this file.

## Notes

- `locale` is removed from the outgoing `query` (destructured out) so the callback view never sees it as a query string — it lives exclusively in `params`.
- The check is intentionally narrow: only a string value present in `supportedLanguages` is honoured. Any other shape (array, `null`, unsupported code) silently falls back to `getDefaultLocale()`.
- This file has no side effects and no state; it is a pure mapping function safe to call in any router guard or navigation handler.
