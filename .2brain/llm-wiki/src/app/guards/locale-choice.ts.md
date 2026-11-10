---
source: src/app/guards/locale-choice.ts
sha256: bd207f9aad5e9a560b4d5110ef1a1d6b80eeb6d9a79b7228d2eb8e8b50f95c63
signature: 764333a825b5ba807497ff93b6a047b1a9f2b5808f38f188ea29dde2e8e45af1
generated_at: 2026-11-10T02:54:52.828727+00:00
model: ollama:qwen3.8:27b
---

# src/app/guards/locale-choice.ts

## Purpose

A Vue Router `beforeResolve` guard that synchronises the active i18n locale with the `:locale` route parameter. It handles first-time dictionary loading (bundled JSON + remote overrides), corrects non-canonical BCP 47 casing (e.g. `/pt-br/` → `/pt-BR/`), redirects when the locale is missing or unsupported, and protects against out-of-order async completions when a user fires rapid locale switches.

## Key elements

- **`localeChoice`** (exported) — The guard itself. Reads `to.params.locale`, resolves the supported spelling, and either proceeds (`true`), redirects to the canonical casing / default locale, or fetches + activates an unloaded dictionary before allowing navigation.
- **`fetchLanguageApi`** (exported) — Dynamically imports `@/locales/{locale}.json`, layers remote overrides on top via `withLocaleOverrides`, and always resolves (never rejects) with `[locale, TranslationDictionaries]`. Unsupported or missing locales degrade to an empty dictionary.
- **`canonicalTag`** (internal) — Returns the BCP 47 canonical spelling via `Intl.getCanonicalLocales`; returns the input unchanged on malformed tags.
- **`supportedSpellingOf`** (internal) — Case-insensitive lookup of a URL segment against `supportedLanguages`, returning the list's own spelling or `undefined`.
- **`latestRequestedLocale`** (module-level `let`) — Tracks the most recently requested locale so concurrent async chains can detect they have been superseded.
- **`activateIfLatest`** (internal) — Calls `changeLanguage` only if this chain's locale is still the latest requested; resolves immediately otherwise.
- **`redirectTo`** (internal) — Builds a `RouteLocationRaw` preserving route name, params (with swapped `locale`), and query.

## Relationships

No graph neighbors are registered for this file.

## Notes

- **Never rejects.** `fetchLanguageApi` catches import failures and API failures, always resolving to `[locale, {}]` or `[locale, overridesOnly]`. Callers have no `.catch`.
- **Stryker suppression.** The dynamic `import(`@/locales/${locale}.json`)` line carries a `Stryker disable StringLiteral` comment because mutating the template to `""` breaks Vite's static analysis for the entire module.
- **`latestRequestedLocale` is module-global state.** It persists across guard invocations within a SPA session. It is deliberately *not* reset between navigations — the guard for staleness is identity comparison, not a reset.
- **`Promise.resolve` wrappers.** Even synchronous redirect paths return `Promise.resolve(redirectTo(...))` rather than a bare object, matching the declared `Promise<true | RouteLocationRaw>` return type and Vue Router 4's expected guard signature.
- **`eslint-disable no-restricted-syntax`** on `Intl.getCanonicalLocales` is intentional: there is no non-throwing variant, and the `catch` path returns the input as-is, which is the correct fallback for malformed tags.
