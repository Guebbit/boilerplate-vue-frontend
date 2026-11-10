---
source: tests/unit/app/oauth-callback.spec.ts
sha256: 5456842282daaaf00683310fc535b0ccb27d927096d371f9052b8a1d7c11df6f
signature: 5456842282daaaf00683310fc535b0ccb27d927096d371f9052b8a1d7c11df6f
generated_at: 2026-11-10T07:47:50.754490+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/app/oauth-callback.spec.ts

## Purpose

Unit tests (Vitest) for the `oauthCallbackLocation` router helper, verifying that an OAuth redirect preserves the visitor's original locale when the build supports it, falls back to the default locale otherwise, rejects malformed locale values, and forwards all other query parameters while stripping `locale` from the query string.

## Key elements

- **`other`** – module-level constant: the first entry in `supportedLanguages` that is *not* the default locale. Used as a known non-default tag so assertions can distinguish "carried locale" from "default fallback."
- **`describe('oauthCallbackLocation', …)`** – the test suite. Contains four `it` / `it.each` blocks:
  - *carried locale* – asserts the returned route object has `name: 'OAuthCallback'` and `params.locale` set to the passed-in tag.
  - *default fallback* – asserts `params.locale` equals `getDefaultLocale()` when no locale is supplied.
  - *ignores unsupported / array / markup locales* – parameterised over three hostile inputs (`'xx'`, `['it','en']`, `'<script>'`); each must land on the default locale.
  - *query passthrough* – asserts non-`locale` keys (`error`, `continue`) appear in `query`, and that a locale-only call yields an empty `query` object.

## Relationships

No graph neighbors are listed for this file.

## Notes

- `other` is resolved at module scope, not inside a test. If the project ever shipped only one language, the non-null assertion (`!`) would throw at import time—intentional, to surface a broken i18n config during tests.
- Assertions use `toMatchObject` (partial match) throughout, so the route object may carry additional fields the test doesn't care about.
- The "repeated param" case passes an **array** as `locale`, simulating a query string like `?locale=it&locale=en`; the implementation is expected to treat it as invalid and fall back.
