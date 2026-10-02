---
source: src/i18n/language-label.ts
sha256: dee05e8aa9a453c9b4cd2040d3e0248ff85d30659196dadd3d2b35705da088ad
generated_at: 2026-10-02T11:53:35.046648+00:00
model: ollama:qwen3.8:27b
---

# src/i18n/language-label.ts

## Purpose

Provides a single pure function that resolves a locale code to a human-readable display name for a language picker. It was factored out of `AppLanguageSwitcher.vue` (FA27) so the logic lives as a plain, importable function rather than being embedded in a component.

## Key elements

- **`Translator`** (interface) — Minimal duck-type for `{ t, te }`, mirroring the two vue-i18n primitives the function needs. Callers pass their own `useI18n()` result; this module never imports vue-i18n.
- **`languageLabel(code, viewingLocale, translator)`** (exported function) — Returns the best available display name for `code`, trying in order:
  1. The app's own translation (`generic.<code>` via `translator.t`).
  2. `localeNativeNames[code]` (the language's own name for itself, from the i18n manifest).
  3. `Intl.DisplayNames` in the viewer's locale.
  4. The bare BCP-47 code as a last resort.

## Relationships

- **`src/i18n/index.ts`** — Imports `localeNativeNames`, a static map of locale code → native language name used as the second fallback in `languageLabel`.

## Notes

- The function is intentionally **stateless and side-effect-free**; it depends only on the `Translator` argument passed in, making it trivial to unit-test.
- The `Intl.DisplayNames` branch is wrapped in `try/catch` because there is no non-throwing way to pre-check for malformed tags or unsupported engines; the `catch` returns the bare code, which is the same result a pre-check would have yielded. A `// eslint-disable-next-line no-restricted-syntax` comment documents this.
- `viewingLocale` only affects the `Intl.DisplayNames` fallback (steps 3–4); the first two steps are locale-independent.
