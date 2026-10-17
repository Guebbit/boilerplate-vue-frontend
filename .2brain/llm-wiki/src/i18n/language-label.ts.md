---
source: src/i18n/language-label.ts
sha256: 0bcd94042e88bc0608ee3d7725de901289f955fb9ab9aa02d1be684fd5080db0
generated_at: 2026-10-17T00:08:21.854079+00:00
model: ollama:qwen3.8:27b
---

# src/i18n/language-label.ts

## Purpose

Provides a plain-function way to resolve a locale tag into a human-readable label for a language picker. It was extracted from `AppLanguageSwitcher.vue` so the logic is callable without mounting a component.

## Key elements

- **`Translator` (interface)** — Minimal `{ t, te }` shape so callers pass their own `useI18n()` result in, avoiding a direct vue-i18n import in this file.
- **`languageLabel(code, viewingLocale, translator)` (exported const arrow function)** — Returns a display name for a language code by trying, in order:
  1. The app's own translated string (`generic.<code>` via `te`/`t`).
  2. `localeNativeNames[code]` from `./index.ts`.
  3. `Intl.DisplayNames([viewingLocale], { type: 'language' }).of(code)`.
  4. The bare `code` string.

## Relationships

- **`src/i18n/index.ts`** — Imports `localeNativeNames` (a locale-tag → native-name map) used as the second fallback in `languageLabel`. This is the file's only import.

## Notes

- The `Intl.DisplayNames` call is wrapped in `try/catch` because `Intl.DisplayNames` has no non-throwing validity check for malformed BCP-47 tags or unsupported engines; the `catch` branch returns the bare code, identical to what a pre-check would yield. An explicit `eslint-disable-next-line no-restricted-syntax` suppresses the lint rule that normally discourages `try` blocks.
- The function is deliberately **not** a vue-i18n composition utility; it receives the translator as a parameter so it stays framework-agnostic and testable.
- `generic.<code>` is the app's own i18n key convention for language names (e.g. `generic.es` → "Español" in an English build). If no key exists (`te` returns false), it falls through to the next source.
