---
source: src/i18n/index.ts
sha256: bafd9ff13f0883760ab54807c6c7ac4d708c87f462d4793a5ef44d2482d68da3
generated_at: 2026-10-02T11:53:20.032566+00:00
model: ollama:qwen3.8:27b
---

# src/i18n/index.ts

## Purpose

Core i18n runtime that owns the full translate pipeline: which languages exist, which are loaded, and the load → activate → merge flow every locale switch goes through. It is deliberately self-contained (FE-D5) so the entire `src/i18n/` folder can be lifted into a standalone package without reaching into the rest of the app.

## Key elements

- **`supportedLanguages`** — mutable array of every language the app offers. Seeded from the bundled JSON folder at build time, extended at boot by `mergeRemoteLocales` (remote manifest). Modules import it by reference; it is *extended in place*, never reassigned.
- **`loadedLanguages`** — tracks which locales have been fetched into the running `i18n` instance.
- **`localeDirections`** / **`localeNativeNames`** — per-locale LTR/RTL and native-name maps, populated at boot from the API manifest; empty offline.
- **`i18n`** — the single `vue-i18n` instance (`legacy: false`). Initial locale/fallback resolved from `window.__APP_CONFIG` → `VITE_*` env → `'en'`.
- **`translate(key, named?)`** — component-free `t()` for use in Zod schema thunks and other module-scope code.
- **`registerLocaleContributors(loadersByLocale)`** — composition-root hook that installs per-locale, per-module dictionary loaders. Must be called before the first `_loadLocale`.
- **`_loadLocale(i18n, locale)`** — dynamic-imports the bundled JSON, merges module dictionaries via `_updateLocale`, then activates the locale. Falls back to the default locale on any failure.
- **`mergeDictionaries(base, extra)`** — deep merge where nested objects combine but **arrays are replaced wholesale** (a translated list is edited whole or not at all). Uses `structuredClone` so neither input is mutated.
- **`loadBundledDictionary(locale)`** — returns the fully merged dictionary (shared + modules) as a plain object *without* touching the live `i18n` instance. Used by the translation admin to read a non-active locale's baseline.
- **`TranslationDictionaries`** — recursive interface allowing `string | string[] | TranslationDictionaries | TranslationDictionaries[]` leaves; the array arms are required for vue-i18n's `tm()`/`rt()` paragraph/FAQ rendering.

## Relationships

- **`src/i18n/language-label.ts`** — consumes `supportedLanguages` and `localeNativeNames` (and likely `localeDirections`) to render a human-readable label for a given locale code.
- **`src/i18n/router-link.ts`** — imports `translate` (or `i18n`) to resolve localized route names/labels when building navigation links.
- **`src/kernel/registry.ts`** — the composition root that calls `registerLocaleContributors` after resolving which domain modules are enabled, passing in their per-locale loader functions.

## Notes

- **No app imports by design.** Config values are read directly from `window.__APP_CONFIG` rather than importing `@/infrastructure/runtime-config`, so the folder can be extracted without a circular dependency.
- **Stryker exemptions.** The `import.meta.glob` literal and the `@/locales/${locale}.json` template literal are annotated with `Stryker disable` because Vite requires a *static* string there; Stryker's mutation would produce `import("")` which breaks the entire build.
- **Array semantics in merges.** `mergeDictionaries` deliberately replaces arrays instead of index-merging them. If you add a list translation, treat it as an all-or-nothing block.
- **`registerLocaleContributors` is idempotent by replacement**, not append — safe to call more than once, but it must run before any `_loadLocale` or module keys will render as raw key names.
- **`legacy: false` is load-bearing.** Switching to legacy mode breaks the composition-API `i18n.global.t` calls used throughout.
