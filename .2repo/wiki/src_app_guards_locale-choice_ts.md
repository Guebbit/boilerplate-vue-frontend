# src/app/guards/locale-choice.ts

## Purpose

A Vue Router `beforeResolve` guard that keeps the active i18n language in sync with the `:locale` route parameter. On first use of a locale it loads the bundled JSON dictionary, merges remote overrides, registers the messages, and activates the language. When the param is missing or unsupported it redirects to the same route with the default locale injected.

## Key elements

- **`fetchLanguageApi(locale: string)`** — Returns `Promise<[string, TranslationDictionaries]>`. Dynamically imports `@/locales/${locale}.json` (Vite code-split chunk), swallows import failures to an empty object, then merges remote overrides via `withLocaleOverrides`. **Always resolves, never rejects**; callers have no `.catch`.
- **`localeChoice(to: RouteLocationNormalized)`** — The guard itself (exported for registration). Three branches:
  1. Locale already in `loadedLanguages` → ensure it's active (`changeLanguage` only if different), resolve `true`.
  2. Supported but not yet loaded → `fetchLanguageApi` → `updateLocale` → `changeLanguage` → resolve `true`.
  3. Missing / unsupported / empty param → resolve a redirect to the same route name with `locale` set to `getDefaultLocale()`.

## Relationships

- **`src/infrastructure/i18n/index.ts`** — Source of `getDefaultLocale`, `getCurrentLocale`, `supportedLanguages`, `loadedLanguages`, `updateLocale`, `changeLanguage`, and the `TranslationDictionaries` type. This file is the primary consumer that *writes* state (`updateLocale`, `changeLanguage`) in addition to reading it.
- **`src/infrastructure/i18n/locale-overrides.ts`** — Provides `withLocaleOverrides`, which fetches and merges per-key remote edits on top of the bundled dictionary (or serves as the sole dictionary for locales with no bundled file).

## Notes

- The guard is declared to return a **Promise**; even the redirect branch wraps the route object in `Promise.resolve` for type consistency.
- The dynamic `import(\`@/locales/${locale}.json\`)` is load-bearing for Vite's static analysis — a Stryker mutation-testing directive disables the `StringLiteral` mutant on that line because an empty template literal breaks the whole module transform, not just that expression.
- `supportedLanguages` is described as already including any locales the API reported at boot, so the guard's "supported" check covers both bundled and remote-only locales.
- `loadedLanguages` acts as an in-memory cache: back/forward navigation between previously loaded locales skips the network entirely.
