---
source: src/i18n/language-label.ts
sha256: 4d513d0213845dc2c20ee22bdf7e1121e7dd14dcc06a1afb98927a985116e770
signature: a9c25d3fef6c2b804b9a22653451d7f4ad670660e2abd19412b6f195bea0b69f
generated_at: 2026-11-10T03:00:34.911987+00:00
model: ollama:qwen3.8:27b
---

# src/i18n/language-label.ts

## Purpose

Provides a standalone function that resolves a locale code to its human-readable display label for language-picker UI. It was extracted from `AppLanguageSwitcher.vue` so the logic lives as a plain, testable function rather than being coupled to a Vue component mount.

## Key elements

- **`Translator` (interface)** — A minimal structural type exposing only `t(key)` and `te(key)` so callers can pass their own `useI18n()` result without this file importing vue-i18n.
- **`languageLabel(code, viewingLocale, translator)` (function)** — Returns a display string for a locale tag via a four-step fallback:
  1. App's own translation (`generic.<code>`) via the provided `Translator`.
  2. The manifest's native name from `localeNativeNames` (the language's name for itself).
  3. `Intl.DisplayNames` resolved in the *viewing* locale (best-effort).
  4. The bare locale code as a last resort.

## Relationships

- **`src/i18n/index.ts`** — Imports `localeNativeNames`, the manifest map of locale codes to native names, used as the second fallback in the resolution chain.

## Notes

- The `Translator` interface is deliberately structural (not a vue-i18n type import) to keep this file dependency-free from the i18n library.
- The `Intl.DisplayNames` call is wrapped in `try/catch` because there is no non-throwing way to pre-validate a BCP-47 tag or engine support; the `catch` simply returns the bare code, which is equivalent to what a pre-check would have produced. The `eslint-disable-next-line no-restricted-syntax` is intentional and documented in-line.
- `te` (translation-exists check) is used before `t` to avoid returning a raw i18n key when no translation exists for `generic.<code>`.
