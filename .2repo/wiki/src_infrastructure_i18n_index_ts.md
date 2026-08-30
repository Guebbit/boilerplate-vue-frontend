# src/infrastructure/i18n/index.ts

## Purpose

Core i18n runtime: defines which languages exist, which are loaded, and the load → activate → merge pipeline every locale switch funnels through. Bundled dictionaries are code-split per locale via a Vite glob; this module wires them into a single `vue-i18n` instance (composition API) and exposes a module-scope `translate` helper for non-component callers (e.g. Zod validation thunks).

## Key elements

- **`TranslationDictionaries`** — recursive type for one locale's message tree; permits `string`, `string[]`, and nested objects/arrays as leaves.
- **`supportedLanguages`** — mutable array, seeded from the `src/locales/*.json` glob, extended at boot by `mergeRemoteLocales` (remote). Import-by-value across ~a dozen modules; must never be reassigned.
- **`loadedLanguages`** — tracks which locales have already been fetched into memory.
- **`localeDirections`** — `Record<string, 'ltr' | 'rtl'>`, populated by `mergeRemoteLocales`; read by `_changeLanguage` to set `<html dir>`.
- **`i18n`** — the app-wide `vue-i18n` instance (`legacy: false`), defaulting to `VITE_APP_DEFAULT_LOCALE` / `VITE_APP_FALLBACK_LOCALE`.
- **`translate`** — thin wrapper over `i18n.global.t` for use outside `setup()` (Zod schema error thunks).
- **`registerLocaleContributors(loadersByLocale)`** — called once from `src/main.ts` to install per-locale, per-module dictionary loaders. Replaces rather than appends.
- **`_loadLocale` / `loadLocale`** — lazy-imports the locale JSON, calls `_updateLocale`, then `_changeLanguage`. Falls back to the default locale on error or unsupported code.
- **`_updateLocale` / `updateLocale`** — registers (replaces) a locale's messages via `setLocaleMessage`, then deep-merges each enabled module's slice with `mergeLocaleMessage`, then awaits `nextTick`.
- **`mergeDictionaries`** — pure helper: `mergeWith` on a `structuredClone` of the base, with an array-replacement customizer (arrays are never index-merged).
- **`loadBundledDictionary(locale)`** — returns the merged bundled dictionary (shared file + module slices) as a plain object *without* touching the live `i18n` instance. Resolves `{}` for unsupported locales.
- **`bundledLocales`** — build-time array derived from `import.meta.glob('/src/locales/*.json')`.

## Relationships

- **`src/infrastructure/i18n/dom.ts`** — imports `applyHtmlLocaleAttributes`, called by `_changeLanguage` to update `<html lang>` / `<html dir>`.
- **`src/main.ts`** — composition root; calls `registerLocaleContributors` and `mergeRemoteLocales` before the first `loadLocale`, satisfying the "install before first use" contract.
- **`src/app/guards/locale-choice.ts`** — router guard that invokes `updateLocale` (the bound form of `_updateLocale`) when the user picks a language at the edge.
- **`src/infrastructure/i18n/locale-overrides.ts`** — applies API-stored overrides *on top of* the merged dictionary at the same edge call-sites (`main.ts`, router guard); this module never imports it.
- **`src/infrastructure/i18n/router-link.ts`** — consumes `i18n` / `translate` for link-label resolution in navigation.

## Notes

- `supportedLanguages` is intentionally **mutable** (pushed to, never reassigned) because many modules hold the original array reference; reassignment would strand them on the boot-time list.
- `setLocaleMessage` **replaces** the entire locale; module merges must happen inside `_updateLocale` on *every* install path, or one path silently drops module keys.
- `structuredClone` is used before both `setLocaleMessage` and `mergeDictionaries` to prevent in-place mutation of the imported JSON module object.
- The three `import.meta.glob` / dynamic `import(...)` call-sites carry Stryker `StringLiteral` exemptions: mutating the literal breaks Vite's static analysis and kills the entire test run rather than producing a single surviving mutant.
- Arrays in `TranslationDictionaries` are **replaced wholesale** during merge (never index-merged), matching the "edited whole or not at all" policy for translated lists.
- `legacy: false` is mandatory; the composition-API `i18n.global` accessor and `setLocaleMessage` / `mergeLocaleMessage` assume it.
